import { useCallback, useRef, useState } from "react"
import { apiFetchJson, buildApiUrl, createAuthHeaders } from "../lib/api"
 
export interface AdminStats {
	pendingMilestones: number
	approvedMilestonesToday: number
	totalScholars: number
	treasuryBalanceUsdc: number
}
 
export interface MilestoneSubmission {
	id: string
	applicant: string
	course: string
	milestoneIndex: number
	description: string
	submissionDate: string
	status: "pending" | "approved" | "rejected"
}
 
export interface PaginatedMilestones {
	items: MilestoneSubmission[]
	totalCount: number
	page: number
	pageSize: number
}
 
export interface BatchMilestoneResult {
	reportId: string
	success: boolean
	status: "approved" | "rejected" | "failed" | "not_found"
	error?: string
	contractTxHash?: string
	reason?: string
}
 
export interface BatchMilestoneResponse {
	action: "approve" | "reject"
	totalRequested: number
	processed: number
	succeeded: number
	failed: number
	results: BatchMilestoneResult[]
}
 
type AdminStatsResponse = {
	pending_milestones: number
	approved_milestones_today: number
	total_scholars: number
	treasury_balance_usdc: number
}
 
type MilestoneSubmissionApi = {
	id: string
	applicant: string
	course: string
	milestone_index: number
	description: string
	submission_date: string
	status: "pending" | "approved" | "rejected"
}
 
type PaginatedMilestonesApi = {
	items: MilestoneSubmissionApi[]
	totalCount: number
	page: number
	pageSize: number
}
 
type BatchMilestoneResultApi = {
	reportId: number
	success: boolean
	status: "approved" | "rejected" | "failed" | "not_found"
	error?: string
	contractTxHash?: string
	reason?: string
}
 
type BatchMilestoneResponseApi = {
	data: {
		action: "approve" | "reject"
		totalRequested: number
		processed: number
		succeeded: number
		failed: number
		results: BatchMilestoneResultApi[]
	}
	error?: string
}
 
const mapMilestoneSubmission = (
	milestone: MilestoneSubmissionApi,
): MilestoneSubmission => ({
	id: milestone.id,
	applicant: milestone.applicant,
	course: milestone.course,
	milestoneIndex: milestone.milestone_index,
	description: milestone.description,
	submissionDate: milestone.submission_date,
	status: milestone.status,
})
 
const mapBatchMilestoneResult = (
	result: BatchMilestoneResultApi,
): BatchMilestoneResult => ({
	reportId: String(result.reportId),
	success: result.success,
	status: result.status,
	error: result.error,
	contractTxHash: result.contractTxHash,
	reason: result.reason,
})
 
export function useAdminStats() {
	const [stats, setStats] = useState<AdminStats | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
 
	const fetchStats = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const data = (await apiFetchJson(
				"/api/admin/stats",
				{ auth: true },
			)) as AdminStatsResponse
			setStats({
				pendingMilestones: data.pending_milestones,
				approvedMilestonesToday: data.approved_milestones_today,
				totalScholars: data.total_scholars,
				treasuryBalanceUsdc: data.treasury_balance_usdc,
			})
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Failed to fetch stats")
		} finally {
			setLoading(false)
		}
	}, [])
 
	return { stats, loading, error, fetchStats }
}
 
export function useAdminMilestones() {
	const [milestones, setMilestones] = useState<MilestoneSubmission[]>([])
	const [totalCount, setTotalCount] = useState(0)
	const [page, setPage] = useState(1)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const filtersRef = useRef<{ course?: string; status?: string }>({})
	const pageRef = useRef(1)
 
	const PAGE_SIZE = 10
 
	const fetchMilestones = useCallback(
		async (
			pageNum: number = 1,
			filters: { course?: string; status?: string } = {},
		) => {
			setLoading(true)
			setError(null)
			filtersRef.current = filters
			pageRef.current = pageNum
			try {
				const params = new URLSearchParams({
					page: String(pageNum),
					pageSize: String(PAGE_SIZE),
					...filters,
				})
				const data = (await apiFetchJson(
					`/api/admin/milestones?${params}`,
					{ auth: true },
				)) as PaginatedMilestonesApi
				setMilestones(data.items.map(mapMilestoneSubmission))
				setTotalCount(data.totalCount)
				setPage(data.page)
			} catch (err: unknown) {
				setError(
					err instanceof Error ? err.message : "Failed to fetch milestones",
				)
			} finally {
				setLoading(false)
			}
		},
		[],
	)
 
	const refreshMilestones = useCallback(async () => {
		await fetchMilestones(pageRef.current, filtersRef.current)
	}, [fetchMilestones])
 
	const approveMilestone = useCallback(
		async (id: string): Promise<boolean> => {
			setError(null)
			try {
				await apiFetchJson(`/api/admin/milestones/${id}/approve`, {
					method: "POST",
					auth: true,
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({}),
				})
				await refreshMilestones()
				return true
			} catch (err: unknown) {
				setMilestones((prev) =>
					prev.map((m) => (m.id === id ? { ...m, status: "pending" } : m)),
				)
				setError(err instanceof Error ? err.message : "Approval failed")
				return false
			}
		},
		[refreshMilestones],
	)
 
	const rejectMilestone = useCallback(
		async (id: string): Promise<boolean> => {
			setMilestones((prev) =>
				prev.map((m) => (m.id === id ? { ...m, status: "rejected" } : m)),
			)
			try {
				await apiFetchJson(`/api/admin/milestones/${id}/reject`, {
					method: "POST",
					auth: true,
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						reason: "Rejected from the admin panel",
					}),
				})
				await refreshMilestones()
				return true
			} catch (err: unknown) {
				setMilestones((prev) =>
					prev.map((m) => (m.id === id ? { ...m, status: "pending" } : m)),
				)
				setError(err instanceof Error ? err.message : "Rejection failed")
				return false
			}
		},
		[refreshMilestones],
	)
 
	const runBatchMilestones = useCallback(
		async (
			path:
				| "/api/admin/milestones/batch-approve"
				| "/api/admin/milestones/batch-reject",
			body: { milestoneIds: number[]; reason?: string },
		): Promise<BatchMilestoneResponse | null> => {
			setError(null)
 
			const response = await fetch(buildApiUrl(path), {
				method: "POST",
				headers: createAuthHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify(body),
			})
 
			const payload = (await response
				.json()
				.catch(() => ({}))) as BatchMilestoneResponseApi
 
			if (!payload.data) {
				const message = payload.error || `Request failed for ${path}`
				setError(message)
				throw new Error(message)
			}
 
			const result = {
				action: payload.data.action,
				totalRequested: payload.data.totalRequested,
				processed: payload.data.processed,
				succeeded: payload.data.succeeded,
				failed: payload.data.failed,
				results: payload.data.results.map(mapBatchMilestoneResult),
			}
 
			if (!response.ok) {
				setError(payload.error || `Request failed for ${path}`)
				return result
			}
 
			await refreshMilestones()
			return result
		},
		[refreshMilestones],
	)
 
	const batchApproveMilestones = useCallback(
		async (ids: string[]): Promise<BatchMilestoneResponse | null> =>
			runBatchMilestones("/api/admin/milestones/batch-approve", {
				milestoneIds: ids.map((id) => Number(id)),
			}),
		[runBatchMilestones],
	)
 
	const batchRejectMilestones = useCallback(
		async (
			ids: string[],
			reason: string = "Rejected from the admin panel",
		): Promise<BatchMilestoneResponse | null> =>
			runBatchMilestones("/api/admin/milestones/batch-reject", {
				milestoneIds: ids.map((id) => Number(id)),
				reason,
			}),
		[runBatchMilestones],
	)
 
	return {
		milestones,
		totalCount,
		page,
		loading,
		error,
		fetchMilestones,
		approveMilestone,
		rejectMilestone,
		batchApproveMilestones,
		batchRejectMilestones,
	}
}
