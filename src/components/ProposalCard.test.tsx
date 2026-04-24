import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { ProposalCard, type ProposalCardProps } from "./ProposalCard"
 
// Mock ProposalCountdown since it might involve timers or complex logic
vi.mock("./ProposalCountdown", () => ({
	default: () => <div data-testid="countdown">Countdown</div>,
}))
 
const mockProps: ProposalCardProps = {
	id: 1,
	proposerAddress: "GBRUIOPQRSTUVWXYZ1234567890ABCDEFGHIKLMNOP",
	title: "Community Outreach",
	amountUsdc: 500,
	yesVotes: 150,
	noVotes: 50,
	deadlineLedger: 1000,
	currentLedger: 500,
	status: "active",
	hasVoted: false,
	onVoteYes: vi.fn(),
	onVoteNo: vi.fn(),
}
 
describe("ProposalCard", () => {
	it("renders proposal details correctly", () => {
		render(<ProposalCard {...mockProps} />)
 
		expect(screen.getByText("Community Outreach")).toBeDefined()
		expect(screen.getByText("500 USDC")).toBeDefined()
		expect(screen.getByText("ACTIVE")).toBeDefined()
		expect(screen.getByText(/YES: 150/)).toBeDefined()
		expect(screen.getByText(/NO: 50/)).toBeDefined()
	})
 
	it("calls onVoteYes when Vote YES button is clicked", () => {
		render(<ProposalCard {...mockProps} />)
 
		const yesButton = screen.getByText("Vote YES")
		fireEvent.click(yesButton)
 
		expect(mockProps.onVoteYes).toHaveBeenCalledTimes(1)
	})
 
	it("calls onVoteNo when Vote NO button is clicked", () => {
		render(<ProposalCard {...mockProps} />)
 
		const noButton = screen.getByText("Vote NO")
		fireEvent.click(noButton)
 
		expect(mockProps.onVoteNo).toHaveBeenCalledTimes(1)
	})
 
	it("disables buttons when hasVoted is true", () => {
		render(<ProposalCard {...mockProps} hasVoted={true} />)
 
		const yesButton = screen.getByText("Vote YES")
		const noButton = screen.getByText("Vote NO")
 
		expect(yesButton).toBeDisabled()
		expect(noButton).toBeDisabled()
		expect(screen.getByText("You have already cast your vote")).toBeDefined()
	})
 
	it("disables buttons when status is not active", () => {
		render(<ProposalCard {...mockProps} status="passed" />)
 
		const yesButton = screen.getByText("Vote YES")
		const noButton = screen.getByText("Vote NO")
 
		expect(yesButton).toBeDisabled()
		expect(noButton).toBeDisabled()
	})
})
