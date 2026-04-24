import { rpc } from "@stellar/stellar-sdk"
import { type Request, type Response } from "express"
 
const STELLAR_NETWORK = process.env.STELLAR_NETWORK ?? "testnet"
const SCHOLARSHIP_TREASURY_CONTRACT_ID =
	process.env.SCHOLARSHIP_TREASURY_CONTRACT_ID ?? ""
 
function parsePositiveInt(value: unknown, fallback: number): number {
	if (typeof value !== "string") return fallback
	const parsed = parseInt(value, 10)
	return !isNaN(parsed) && parsed > 0 ? parsed : fallback
}
 
const rpcUrl =
	STELLAR_NETWORK === "mainnet"
		? "https://soroban-testnet.stellar.org" // TODO: Update for mainnet
		: "https://soroban-testnet.stellar.org"
 
export const getTreasuryStats = async (
	_req: Request,
	res: Response,
): Promise<void> => {
	if (!SCHOLARSHIP_TREASURY_CONTRACT_ID) {
		res.status(503).json({
			error: "Treasury contract not configured",
		})
		return
	}
 
	try {
		const server = new rpc.Server(rpcUrl)
 
		// Fetch events from the ScholarshipTreasury contract
		const response = await server.getEvents({
			filters: [{ contract: SCHOLARSHIP_TREASURY_CONTRACT_ID }],
			startLedger: process.env.STARTING_LEDGER || "460000000",
			pagination: { maxPageSize: 1000 },
		})
 
		let totalDeposited = BigInt(0)
		let totalDisbursed = BigInt(0)
		const donors = new Set<string>()
		const scholars = new Set<string>()
		let activeProposals = 0
 
		// Parse events to calculate stats
		for (const page of response.events) {
			for (const event of page) {
				const { scValToNative } = await import("@stellar/stellar-sdk")
				const eventData = scValToNative(event.value)
 
				// Identify event type from topics
				const topics = event.topic.map((t: any) => scValToNative(t))
				const eventType = topics[0]
 
				if (eventType === "deposit" || eventType === "Deposit") {
					const amount = BigInt(eventData.amount || 0)
					totalDeposited += amount
					if (eventData.donor) donors.add(eventData.donor)
				} else if (eventType === "disburse" || eventType === "Disburse") {
					const amount = BigInt(eventData.amount || 0)
					totalDisbursed += amount
					if (eventData.scholar) scholars.add(eventData.scholar)
				} else if (eventType === "proposal_submitted") {
					activeProposals++
				}
			}
		}
 
		res.status(200).json({
			totalDeposited: totalDeposited.toString(),
			totalDisbursed: totalDisbursed.toString(),
			donorCount: donors.size,
			scholarCount: scholars.size,
			activeProposals,
		})
	} catch (err) {
		console.error("Error fetching treasury stats:", err)
		res.status(500).json({ error: "Failed to fetch treasury stats" })
	}
}
 
export const getTreasuryActivity = async (
	req: Request,
	res: Response,
): Promise<void> => {
	if (!SCHOLARSHIP_TREASURY_CONTRACT_ID) {
		res.status(503).json({
			error: "Treasury contract not configured",
		})
		return
	}
 
	const limit = parsePositiveInt(req.query.limit, 10)
 
	try {
		const server = new rpc.Server(rpcUrl)
 
		// Fetch events from the ScholarshipTreasury contract
		const response = await server.getEvents({
			filters: [{ contract: SCHOLARSHIP_TREASURY_CONTRACT_ID }],
			startLedger: process.env.STARTING_LEDGER || "460000000",
			pagination: { maxPageSize: 1000 },
		})
 
		const events: Array<{
			type: "deposit" | "disburse"
			amount: string
			address?: string
			scholar?: string
			tx_hash: string
			created_at: string
		}> = []
 
		// Parse and format events
		for (const page of response.events) {
			for (const event of page) {
				const { scValToNative } = await import("@stellar/stellar-sdk")
				const eventData = scValToNative(event.value)
 
				// Identify event type from topics
				const topics = event.topic.map((t: any) => scValToNative(t))
				const eventType = topics[0]
 
				if (eventType === "deposit" || eventType === "Deposit") {
					events.push({
						type: "deposit",
						amount: eventData.amount?.toString() || "0",
						address: eventData.donor || "unknown",
						tx_hash: event.txHash || "",
						created_at: event.ledgerClosedAt || new Date().toISOString(),
					})
				} else if (eventType === "disburse" || eventType === "Disburse") {
					events.push({
						type: "disburse",
						scholar: eventData.scholar || "unknown",
						amount: eventData.amount?.toString() || "0",
						tx_hash: event.txHash || "",
						created_at: event.ledgerClosedAt || new Date().toISOString(),
					})
				}
			}
		}
 
		// Sort by created_at desc and apply limit
		const result = events
			.sort(
				(a, b) =>
					new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
			)
			.slice(0, limit)
 
		res.status(200).json(result)
	} catch (err) {
		console.error("Error fetching treasury activity:", err)
		res.status(500).json({ error: "Failed to fetch treasury activity" })
	}
}
