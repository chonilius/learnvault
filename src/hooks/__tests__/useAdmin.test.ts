import { renderHook, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useAdminStats, useAdminMilestones } from "../useAdmin"
import { apiFetchJson } from "../../lib/api"
 
vi.mock("../../lib/api", () => ({
	apiFetchJson: vi.fn(),
	buildApiUrl: vi.fn((path) => path),
	createAuthHeaders: vi.fn(() => ({})),
}))
 
describe("useAdmin hooks", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})
 
	describe("useAdminStats", () => {
		it("fetches and maps admin stats", async () => {
			const mockStats = {
				pending_milestones: 5,
				approved_milestones_today: 2,
				total_scholars: 100,
				treasury_balance_usdc: 5000,
			}
			vi.mocked(apiFetchJson).mockResolvedValue(mockStats)
 
			const { result } = renderHook(() => useAdminStats())
			
			result.current.fetchStats()
 
			await waitFor(() => expect(result.current.loading).toBe(false))
 
			expect(result.current.stats).toEqual({
				pendingMilestones: 5,
				approvedMilestonesToday: 2,
				totalScholars: 100,
				treasuryBalanceUsdc: 5000,
			})
		})
	})
 
	describe("useAdminMilestones", () => {
		it("fetches paginated milestones", async () => {
			const mockData = {
				items: [
					{
						id: "1",
						applicant: "G1",
						course: "C1",
						milestone_index: 1,
						description: "M1",
						submission_date: "2024-01-01",
						status: "pending",
					},
				],
				totalCount: 1,
				page: 1,
				pageSize: 10,
			}
			vi.mocked(apiFetchJson).mockResolvedValue(mockData)
 
			const { result } = renderHook(() => useAdminMilestones())
			
			result.current.fetchMilestones(1)
 
			await waitFor(() => expect(result.current.loading).toBe(false))
 
			expect(result.current.milestones).toHaveLength(1)
			expect(result.current.milestones[0].id).toBe("1")
			expect(result.current.totalCount).toBe(1)
		})
 
		it("approves a milestone", async () => {
			const { result } = renderHook(() => useAdminMilestones())
			
			vi.mocked(apiFetchJson).mockResolvedValueOnce({ 
				items: [{ 
					id: "1", 
					applicant: "G1", 
					course: "C1", 
					milestone_index: 1, 
					description: "M1",
					submission_date: "2024-01-01", 
					status: "pending" 
				}], 
				totalCount: 1, 
				page: 1,
				pageSize: 10
			})
			await result.current.fetchMilestones(1)
 
			vi.mocked(apiFetchJson).mockResolvedValueOnce({}) // approve call
			vi.mocked(apiFetchJson).mockResolvedValueOnce({ // refresh call
				items: [{ 
					id: "1", 
					applicant: "G1", 
					course: "C1", 
					milestone_index: 1, 
					description: "M1",
					submission_date: "2024-01-01", 
					status: "approved" 
				}], 
				totalCount: 1, 
				page: 1,
				pageSize: 10
			})
 
			const success = await result.current.approveMilestone("1")
 
			expect(success).toBe(true)
			expect(result.current.milestones[0].status).toBe("approved")
		})
	})
})
