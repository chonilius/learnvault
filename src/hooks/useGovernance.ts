import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { useToast } from "../components/Toast/ToastProvider"
import { ErrorCode, createAppError } from "../types/errors"
import { type Proposal, type RawContractProposal } from "../types/governance"
import { parseError, isUserRejection } from "../utils/errors"
import { useWallet } from "./useWallet"

export type { Proposal }

const readEnv = (key: string): string | undefined => {
	const value = (import.meta.env as Record<string, unknown>)[key]
	return typeof value === "string" && value.length ? value : undefined
}

const SCHOLARSHIP_TREASURY_CONTRACT = readEnv(
	"PUBLIC_SCHOLARSHIP_TREASURY_CONTRACT",
)
const GOVERNANCE_TOKEN_CONTRACT = readEnv("PUBLIC_GOVERNANCE_TOKEN_CONTRACT")

/**
 * Hook to manage governance interactions: reading proposals, voting power, and casting votes.
 */
export function useGovernance() {
	const { address, signTransaction } = useWallet()
	const queryClient = useQueryClient()
	const { showSuccess, showError, showInfo } = useToast()

	// Helper to load contract clients
	const loadClient = useCallback(async (path: string) => {
		try {
			const mod = (await import(/* @vite-ignore */ path)) as Record<
				string,
				unknown
			>
			return (mod.default as Record<string, unknown>) ?? mod
		} catch (err) {
			console.warn(
				createAppError(
					ErrorCode.CONTRACT_NOT_DEPLOYED,
					"Contract not available",
					{ contractPath: path },
					err,
				),
			)
			return null
		}
	}, [])

	// Fetch voting power (GOV token balance)
	const { data: votingPower = 0n } = useQuery({
		queryKey: ["governance", "votingPower", address],
		queryFn: async () => {
			if (!address || !GOVERNANCE_TOKEN_CONTRACT) return 0n
			const client = await loadClient("../contracts/governance_token")
			if (!client) return 0n

			// Standard Soroban token 'balance' call
			const balanceFn =
				(client.balance as Function) || (client.get_balance as Function)
			if (typeof balanceFn !== "function") return 0n

			const res = await balanceFn({ id: address, user: address })
			return typeof res === "bigint" ? res : BigInt(res)
		},
		enabled: !!address,
	})

	// Fetch all proposals
	const { data: proposals = [], isLoading: isLoadingProposals } = useQuery<Proposal[]>({
		queryKey: ["governance", "proposals"],
		queryFn: async () => {
			if (!SCHOLARSHIP_TREASURY_CONTRACT) return []
			const client = await loadClient("../contracts/scholarship_treasury")
			if (!client) return []

			const getProposalsFn =
				(client.get_proposals as Function) || (client.getProposals as Function)
			if (typeof getProposalsFn !== "function") return []

			const raw = await getProposalsFn()
			const proposals = Array.isArray(raw) ? raw : []
			
			// In a real app, we'd fetch the current ledger to derive status correctly.
			// For now, we'll derive it from the proposal data we have.
			return (proposals as RawContractProposal[]).map((p) => {
				const votesFor = BigInt(p.yes_votes ?? p.votes_for ?? p.votesFor ?? 0)
				const votesAgainst = BigInt(p.no_votes ?? p.votes_against ?? p.votesAgainst ?? 0)
				const deadline = Number(p.deadline_ledger ?? p.end_date ?? p.endDate ?? 0)
				
				// Status derivation logic (simplified: if no status from contract, we could derive)
				let status: Proposal["status"] = (p.status as Proposal["status"]) || "Active"
				
				return {
					id: Number(p.id ?? 0),
					title: String(p.program_name ?? p.title ?? ""),
					description: String(p.program_description ?? p.description ?? ""),
					author: String(p.applicant ?? p.author ?? p.author_address ?? ""),
					status,
					votesFor,
					votesAgainst,
					endDate: deadline,
				}
			})
		},
	})

	// Check if voter has already voted on a specific proposal
	const hasVoted = useCallback(
		(proposalId: number) => {
			return !!queryClient.getQueryData([
				"governance",
				"voted",
				proposalId,
				address,
			])
		},
		[address, queryClient],
	)

	// Fetch individual 'voted' status for each proposal
	useQuery({
		queryKey: ["governance", "voted", address],
		queryFn: async () => {
			if (!address || !SCHOLARSHIP_TREASURY_CONTRACT || proposals.length === 0)
				return {}
			const client = await loadClient("../contracts/scholarship_treasury")
			if (!client) return {}

			const hasVotedFn =
				(client.has_voted as Function) || (client.hasVoted as Function)
			if (typeof hasVotedFn !== "function") return {}

			const results: Record<number, boolean> = {}
			await Promise.all(
				proposals.map(async (p) => {
					try {
						const voted = await hasVotedFn({
							voter: address,
							proposal_id: p.id,
						})
						results[p.id] = !!voted
						// Also update the individual cache
						queryClient.setQueryData(
							["governance", "voted", p.id, address],
							!!voted,
						)
					} catch {
						results[p.id] = false
					}
				}),
			)
			return results
		},
		enabled: !!address && proposals.length > 0,
	})

	// Mutation for casting a vote
	const { mutateAsync: castVote, isPending: isVoting } = useMutation({
		mutationFn: async ({
			proposalId,
			support,
		}: {
			proposalId: number
			support: boolean
		}) => {
			if (!address) throw new Error("Wallet not connected")
			if (!SCHOLARSHIP_TREASURY_CONTRACT)
				throw new Error("Contract not configured")

			const client = await loadClient("../contracts/scholarship_treasury")
			if (!client) throw new Error("Contract client not found")

			const voteFn = (client.vote as Function) || (client.cast_vote as Function)
			if (typeof voteFn !== "function") throw new Error("Vote method not found")

			const tx = await voteFn(
				{
					proposal_id: proposalId,
					voter: address,
					support,
				},
				{ publicKey: address },
			)

			// Generated clients return an object with signAndSend
			if (tx && typeof tx.signAndSend === "function") {
				await tx.signAndSend({ signTransaction })
			} else {
				// Fallback or manual signing if needed
				console.warn("Transaction object missing signAndSend method", tx)
			}
		},
		onSuccess: (_, { proposalId }) => {
			showSuccess("Vote submitted successfully!")
			// Invalidate queries to refresh UI
			void queryClient.invalidateQueries({
				queryKey: ["governance", "proposals"],
			})
			void queryClient.invalidateQueries({
				queryKey: ["governance", "voted"],
			})
			// Optimistically update the specific voted status
			queryClient.setQueryData(
				["governance", "voted", proposalId, address],
				true,
			)
		},

		onError: (error: unknown) => {
			if (isUserRejection(error)) {
				showInfo("Vote cancelled")
				return
			}
			const appError = parseError(error)
			const message =
				appError.code === ErrorCode.WALLET_NOT_CONNECTED
					? "Please connect your wallet to vote"
					: appError.code === ErrorCode.CONTRACT_NOT_DEPLOYED
						? "Voting is not available on this network"
						: "Vote failed. Already voted or voting closed."
			showError(message)
		},
	})

	return {
		votingPower,
		proposals,
		isLoadingProposals,
		castVote: (proposalId: number, support: boolean) =>
			castVote({ proposalId, support }),
		isVoting,
		hasVoted,
	}
}
