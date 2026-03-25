import { useEffect, useState } from "react"
import { useToast } from "../components/Toast/ToastProvider"
import { rpcUrl } from "../contracts/util"
import { ErrorCode, createAppError } from "../types/errors"
import { parseError } from "../utils/errors"
import { useWallet } from "./useWallet"

export interface DonorContribution {
	txHash: string
	amount: number
	date: string
	block: number
}

export interface DonorStats {
	totalContributed: number
	governanceBalance: number
	governancePercentage: number
	activeVotes: number
	scholarsEnabled: number
}

export interface Vote {
	proposalId: string
	proposalTitle: string
	voteChoice: "for" | "against"
	votePower: number
	status: "active" | "passed" | "rejected"
}

export interface Scholar {
	id: string
	name: string
	proposalAmount: number
	fundedPercentage: number
	progressPercentage: number
	status: "active" | "completed"
}

export interface DonorData {
	stats: DonorStats
	contributions: DonorContribution[]
	votes: Vote[]
	scholars: Scholar[]
	isLoading: boolean
	error: string | null
	isEmpty: boolean
}

const readEnv = (key: string): string | undefined => {
	const value = (import.meta.env as Record<string, unknown>)[key]
	return typeof value === "string" && value.length ? value : undefined
}

const TREASURY_CONTRACT = readEnv("PUBLIC_SCHOLARSHIP_TREASURY_CONTRACT")
const GOVERNANCE_CONTRACT = readEnv("PUBLIC_GOVERNANCE_TOKEN_CONTRACT")
const COURSE_MILESTONE_CONTRACT = readEnv("PUBLIC_COURSE_MILESTONE_CONTRACT")

interface RpcEvent {
	id?: string
	ledger?: number
	ledgerCloseTime?: string
	topic?: unknown[]
	topics?: unknown[]
	value?: unknown
	txHash?: string
}

const fetchContractEvents = async (
	contractIds: string[],
	walletAddress: string,
): Promise<RpcEvent[]> => {
	if (!contractIds.length) return []

	try {
		const response = await fetch(rpcUrl, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: "donor-events",
				method: "getEvents",
				params: {
					filters: [{ type: "contract", contractIds }],
					pagination: { limit: 100 },
				},
			}),
		})

		if (!response.ok) return []
		const payload = (await response.json()) as {
			result?: { events?: RpcEvent[] }
		}
		const events = payload.result?.events ?? []
		return events.filter((evt) =>
			JSON.stringify(evt).toLowerCase().includes(walletAddress.toLowerCase()),
		)
	} catch (err) {
		console.warn(
			createAppError(
				ErrorCode.NETWORK_ERROR,
				"Failed to fetch contract events",
				{ contractCount: contractIds.length },
				err,
			),
		)
		return []
	}
}

/**
 * Parse deposit events from ScholarshipTreasury contract
 * Event structure: DepositRecorded { donor: Address, amount: i128 }
 */
const parseContributionEvents = (events: RpcEvent[]): DonorContribution[] => {
	return events
		.filter((evt) => {
			const text = JSON.stringify({
				topic: evt.topics ?? evt.topic,
				value: evt.value,
			}).toLowerCase()
			return text.includes("deposit") || text.includes("depositrecorded")
		})
		.map((evt) => {
			// Try to extract amount from event value
			let amount = 0
			const valueStr = JSON.stringify(evt.value)
			const amountMatch = valueStr.match(/"amount"\s*:\s*"?(\d+)"?/)
			if (amountMatch) {
				amount = parseInt(amountMatch[1], 10)
			}

			// If amount not found, try alternative parsing
			if (amount === 0) {
				const scValMatch = valueStr.match(/i128\s*(\d+)/)
				if (scValMatch) {
					amount = parseInt(scValMatch[1], 10)
				}
			}

			return {
				txHash: evt.txHash ?? evt.id ?? "unknown",
				amount,
				date: evt.ledgerCloseTime
					? new Date(evt.ledgerCloseTime).toISOString().split("T")[0]
					: new Date().toISOString().split("T")[0],
				block: evt.ledger ?? 0,
			}
		})
		.filter((c): c is DonorContribution => c.amount > 0)
}

/**
 * Parse vote events from ScholarshipTreasury contract
 * Event structure: VoteCast { voter: Address, proposal_id: u32, support: bool, weight: i128 }
 */
const parseVoteEvents = (events: RpcEvent[]): Vote[] => {
	return events
		.filter((evt) => {
			const text = JSON.stringify({
				topic: evt.topics ?? evt.topic,
				value: evt.value,
			}).toLowerCase()
			return text.includes("vote") || text.includes("votecast")
		})
		.map((evt) => {
			const text = JSON.stringify({
				topic: evt.topics ?? evt.topic,
				value: evt.value,
			}).toLowerCase()

			// Extract proposal ID
			let proposalId = "0"
			const proposalMatch = text.match(/proposal[^0-9]*(\d+)/)
			if (proposalMatch) {
				proposalId = proposalMatch[1]
			}

			// Extract vote choice (support)
			let voteChoice: "for" | "against" = "for"
			if (text.includes("false") || text.includes('"support":false')) {
				voteChoice = "against"
			}

			// Extract vote weight
			let votePower = 0
			const weightMatch = text.match(/(?:weight|amount)[^0-9]*(\d+)/)
			if (weightMatch) {
				votePower = parseInt(weightMatch[1], 10)
			}

			// Default proposal title based on ID
			const proposalTitles: Record<string, string> = {
				"1": "Proposal #1",
				"2": "Proposal #2",
				"3": "Proposal #3",
			}
			const proposalTitle = proposalTitles[proposalId] ?? `Proposal #${proposalId}`

			return {
				proposalId,
				proposalTitle,
				voteChoice,
				votePower,
				status: "active" as const,
			}
		})
		.filter((v): v is Vote => v.votePower > 0)
}

/**
 * Parse milestone completion events from CourseMilestone contract
 * to find scholars linked to this donor's contributions
 * Event structure: MilestoneCompleted { learner, course_id, milestones_completed, tokens_minted }
 */
const parseScholarEvents = (events: RpcEvent[]): Scholar[] => {
	const scholarMap = new Map<string, Scholar>()

	events
		.filter((evt) => {
			const text = JSON.stringify({
				topic: evt.topics ?? evt.topic,
				value: evt.value,
			}).toLowerCase()
			return (
				text.includes("milestone") ||
				text.includes("milestonecompleted") ||
				text.includes("disbursement")
			)
		})
		.forEach((evt) => {
			const text = JSON.stringify({
				topic: evt.topics ?? evt.topic,
				value: evt.value,
			}).toLowerCase()

			// Try to extract learner address (scholar)
			let scholarId = ""
			const learnerMatch = text.match(/learner[^0-9a-z]*([0-9a-z]+)/)
			if (learnerMatch) {
				scholarId = learnerMatch[1].substring(0, 12)
			}

			// Try to extract amount/funding
			let proposalAmount = 0
			const amountMatch = text.match(/(?:amount|tokens)[^0-9]*(\d+)/)
			if (amountMatch) {
				proposalAmount = parseInt(amountMatch[1], 10)
			}

			// Try to extract milestone progress
			let progressPercentage = 0
			const progressMatch = text.match(/milestone[^0-9]*(\d+)/)
			if (progressMatch) {
				const milestoneNum = parseInt(progressMatch[1], 10)
				progressPercentage = Math.min(milestoneNum * 25, 100) // Assuming 4 milestones
			}

			// Only add if we have meaningful data
			if (scholarId || proposalAmount > 0) {
				const id = scholarId || `scholar-${Math.random().toString(36).substring(7)}`
				const existing = scholarMap.get(id)

				if (existing) {
					// Update with higher values if this event has more progress
					existing.progressPercentage = Math.max(
						existing.progressPercentage,
						progressPercentage,
					)
					existing.proposalAmount = Math.max(existing.proposalAmount, proposalAmount)
					existing.fundedPercentage = Math.min(
						existing.fundedPercentage + (proposalAmount > 0 ? 25 : 0),
						100,
					)
				} else {
					scholarMap.set(id, {
						id,
						name: `Scholar ${id.substring(0, 4)}`,
						proposalAmount,
						fundedPercentage: proposalAmount > 0 ? 25 : 0,
						progressPercentage,
						status: progressPercentage >= 100 ? "completed" : "active",
					})
				}
			}
		})

	return Array.from(scholarMap.values())
}

/**
 * Create an empty donor data structure when user has no activity
 */
const createEmptyDonorData = (): DonorData => ({
	stats: {
		totalContributed: 0,
		governanceBalance: 0,
		governancePercentage: 0,
		activeVotes: 0,
		scholarsEnabled: 0,
	},
	contributions: [],
	votes: [],
	scholars: [],
	isLoading: false,
	error: null,
	isEmpty: true,
})

export const useDonor = (): DonorData => {
	const { address } = useWallet()
	const { showError } = useToast()
	const [data, setData] = useState<DonorData>({
		stats: {
			totalContributed: 0,
			governanceBalance: 0,
			governancePercentage: 0,
			activeVotes: 0,
			scholarsEnabled: 0,
		},
		contributions: [],
		votes: [],
		scholars: [],
		isLoading: true,
		error: null,
		isEmpty: false,
	})

	useEffect(() => {
		const loadData = async () => {
			if (!address) {
				setData((prev) => ({ ...prev, isLoading: false }))
				return
			}

			try {
				// Collect all contract IDs
				const contractIds = [
					TREASURY_CONTRACT,
					GOVERNANCE_CONTRACT,
					COURSE_MILESTONE_CONTRACT,
				].filter((id): id is string => Boolean(id))

				if (!contractIds.length) {
					// No contracts configured - show empty state
					setData(createEmptyDonorData())
					return
				}

				// Fetch all events from contracts
				const events = await fetchContractEvents(contractIds, address)

				// Parse contribution events from ScholarshipTreasury
				const contributions = parseContributionEvents(events)

				// Parse vote events
				const votes = parseVoteEvents(events)

				// Parse scholar events from CourseMilestone
				const scholars = parseScholarEvents(events)

				// Calculate stats from real data
				const totalContributed = contributions.reduce(
					(sum, c) => sum + c.amount,
					0,
				)
				const governanceBalance = totalContributed
				const activeVotes = votes.filter((v) => v.status === "active").length
				const scholarsEnabled = scholars.length

				// Determine if data is empty
				const isEmpty =
					contributions.length === 0 &&
					votes.length === 0 &&
					scholars.length === 0

				setData({
					stats: {
						totalContributed,
						governanceBalance,
						governancePercentage: 0, // Would need total supply to calculate
						activeVotes,
						scholarsEnabled,
					},
					contributions,
					votes,
					scholars,
					isLoading: false,
					error: null,
					isEmpty,
				})
			} catch (_err) {
				setData((prev) => ({
					...prev,
					error: appError.message,
					isLoading: false,
				}))
				showError(userMessage)
			}
		}

		void loadData()
	}, [address, showError])

	return data
}
