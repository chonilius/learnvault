/**
 * pages/Leaderboard.tsx
 *
 * Issue #31 — Build Community Leaderboard page
 * bakeronchain/learnvault
 *
 * Features:
 *   - Paginated table: Rank | Avatar | Address | LRN Balance | Courses | Joined
 *   - Top 3 gold/silver/bronze medal highlights
 *   - "My Rank" sticky row (requires wallet connection)
 *   - Time filter: All Time / This Month / This Week
 *   - Search by wallet address (debounced)
 *   - Row click → /profile/:address
 *   - Horizontally scrollable on mobile
 */

import React, { useState, useEffect, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { LeaderboardRowSkeleton } from "../components/SkeletonLoader"
import { useWallet } from "../hooks/useWallet"
import {
	generateLeaderboard,
	filterByTime,
	shortenAddr,
	type LeaderboardEntry,
} from "../util/mockLeaderboardData"

const PAGE_SIZE = 25

type TimeFilter = "all" | "month" | "week"

const MEDAL: Record<number, { emoji: string; color: string; glow: string }> = {
	1: { emoji: "🥇", color: "text-yellow-400", glow: "shadow-yellow-500/30" },
	2: { emoji: "🥈", color: "text-slate-300", glow: "shadow-slate-400/30" },
	3: { emoji: "🥉", color: "text-orange-400", glow: "shadow-orange-500/30" },
}

function avatarLetters(address: string): string {
	return address.length >= 2
		? `${address[0]}${address[address.length - 1]}`
		: "??"
}

interface RowProps {
	entry: LeaderboardEntry & { rank: number }
	isMine: boolean
	onClick: () => void
	isMyRankBanner?: boolean
}

const LeaderboardRow: React.FC<RowProps> = ({
	entry,
	isMine,
	onClick,
	isMyRankBanner,
}) => {
	const medal = MEDAL[entry.rank]
	const rowBg = isMine
		? "bg-brand-cyan/10 border-brand-cyan/30"
		: medal
			? "bg-white/5 border-white/10"
			: "bg-transparent border-white/5"

	return (
		<tr
			onClick={onClick}
			className={`
				border-b ${rowBg} cursor-pointer transition-all duration-200
				hover:bg-white/10 group
				${isMyRankBanner ? "sticky bottom-0 z-20 backdrop-blur-xl" : ""}
			`}
		>
			{/* Rank */}
			<td className="px-4 py-4 whitespace-nowrap">
				<div
					className={`flex items-center gap-2 font-black text-lg ${medal ? medal.color : "text-white/40"}`}
				>
					{medal ? (
						<span className="text-2xl">{medal.emoji}</span>
					) : (
						<span className="text-sm w-8 text-center">{entry.rank}</span>
					)}
				</div>
			</td>

			{/* Avatar + Address */}
			<td className="px-4 py-4 whitespace-nowrap">
				<div className="flex items-center gap-3">
					<div
						className={`
						w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0
						${medal ? `bg-gradient-to-br from-white/20 to-white/5 shadow-lg ${medal.glow}` : "bg-white/10"}
						${isMine ? "bg-brand-cyan/20 text-brand-cyan" : ""}
					`}
					>
						{avatarLetters(entry.address)}
					</div>
					<span className="font-mono text-sm text-white/70 group-hover:text-white transition-colors">
						{shortenAddr(entry.address)}
					</span>
					{isMine && (
						<span className="text-[10px] font-black uppercase tracking-widest text-brand-cyan bg-brand-cyan/10 px-2 py-0.5 rounded-full border border-brand-cyan/30">
							You
						</span>
					)}
				</div>
			</td>

			{/* LRN Balance */}
			<td className="px-4 py-4 whitespace-nowrap text-right">
				<span
					className={`font-black text-sm ${medal ? medal.color : "text-white/80"}`}
				>
					{new Intl.NumberFormat().format(entry.lrnBalance)} LRN
				</span>
			</td>

			{/* Courses Completed */}
			<td className="px-4 py-4 whitespace-nowrap text-center">
				<span className="font-mono text-sm text-white/60">
					{entry.coursesCompleted}
				</span>
			</td>

			{/* Joined */}
			<td className="px-4 py-4 whitespace-nowrap text-right text-xs text-white/40 font-medium">
				{entry.joinedDate.toLocaleDateString()}
			</td>
		</tr>
	)
}

const Leaderboard: React.FC = () => {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const { address: connectedAddress } = useWallet()

	const [isLoading, setIsLoading] = useState(true)
	const [timeFilter, setTimeFilter] = useState<TimeFilter>("all")
	const [searchQuery, setSearchQuery] = useState("")
	const [debouncedSearch, setDebouncedSearch] = useState("")
	const [page, setPage] = useState(1)
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	// Issue #44 — Simulate async data fetch for skeleton demo
	useEffect(() => {
		const timer = setTimeout(() => setIsLoading(false), 1500)
		return () => clearTimeout(timer)
	}, [])

	// Debounce search input
	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			setDebouncedSearch(searchQuery)
			setPage(1)
		}, 300)
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current)
		}
	}, [searchQuery])

	// Reset page when filter changes
	useEffect(() => {
		setPage(1)
	}, [timeFilter])

	const allEntries = useMemo(
		() => generateLeaderboard(connectedAddress ?? undefined),
		[connectedAddress],
	)

	const filtered = useMemo(() => {
		let result = filterByTime(allEntries, timeFilter)
		if (debouncedSearch) {
			result = result.filter((e) =>
				e.address.toLowerCase().includes(debouncedSearch.toLowerCase()),
			)
		}
		return result
	}, [allEntries, timeFilter, debouncedSearch])

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
	const pageEntries = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

	const myEntry = connectedAddress
		? (allEntries.find((e) => e.address === connectedAddress) as
				| (LeaderboardEntry & { rank: number })
				| undefined)
		: undefined

	const filterButtons: { key: TimeFilter; label: string }[] = [
		{ key: "all", label: t("pages.leaderboard.filterAll") },
		{ key: "month", label: t("pages.leaderboard.filterMonth") },
		{ key: "week", label: t("pages.leaderboard.filterWeek") },
	]

	return (
		<div className="p-6 md:p-12 max-w-6xl mx-auto text-white animate-in fade-in slide-in-from-bottom-8 duration-1000">
			{/* Header */}
			<header className="mb-12 text-center">
				<h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tighter text-gradient">
					{t("pages.leaderboard.title")}
				</h1>
				<p className="text-white/40 text-lg font-medium">
					{t("pages.leaderboard.desc")}
				</p>
			</header>

			{/* Controls */}
			<div className="flex flex-col sm:flex-row gap-4 mb-8">
				{/* Time Filter */}
				<div className="flex gap-2 p-1 glass rounded-xl border border-white/10 flex-shrink-0">
					{filterButtons.map(({ key, label }) => (
						<button
							key={key}
							onClick={() => setTimeFilter(key)}
							className={`
								px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all
								${
									timeFilter === key
										? "bg-brand-cyan text-black shadow-lg shadow-brand-cyan/30"
										: "text-white/40 hover:text-white"
								}
							`}
						>
							{label}
						</button>
					))}
				</div>

				{/* Search */}
				<div className="flex-1 relative">
					<span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">
						🔍
					</span>
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder={t("pages.leaderboard.searchPlaceholder")}
						className="
							w-full pl-10 pr-4 py-3 glass rounded-xl border border-white/10
							text-sm text-white placeholder:text-white/25 font-mono
							focus:outline-none focus:border-brand-cyan/40 transition-all
							bg-transparent
						"
					/>
				</div>
			</div>

			{/* Table */}
			{isLoading ? (
				<LeaderboardRowSkeleton />
			) : (
				<div className="glass-card rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl relative">
					{/* Horizontally scrollable on mobile */}
					<div className="overflow-x-auto">
						<table className="w-full min-w-[640px]">
							<thead>
								<tr className="border-b border-white/10 text-[10px] uppercase tracking-[2px] text-white/30 font-black">
									<th className="px-4 py-4 text-left">
										{t("pages.leaderboard.rank")}
									</th>
									<th className="px-4 py-4 text-left">
										{t("pages.leaderboard.learner")}
									</th>
									<th className="px-4 py-4 text-right">
										{t("pages.leaderboard.lrnBalance")}
									</th>
									<th className="px-4 py-4 text-center">
										{t("pages.leaderboard.courses")}
									</th>
									<th className="px-4 py-4 text-right">
										{t("pages.leaderboard.joined")}
									</th>
								</tr>
							</thead>
							<tbody>
								{pageEntries.length === 0 ? (
									<tr>
										<td
											colSpan={5}
											className="px-4 py-16 text-center text-white/30 text-sm font-medium"
										>
											{t("pages.leaderboard.noResults")}
										</td>
									</tr>
								) : (
									pageEntries.map((entry) => (
										<LeaderboardRow
											key={entry.id}
											entry={entry as LeaderboardEntry & { rank: number }}
											isMine={
												connectedAddress !== undefined &&
												entry.address === connectedAddress
											}
											onClick={() => navigate(`/profile/${entry.address}`)}
										/>
									))
								)}

								{/* Sticky "My Rank" row for connected wallet */}
								{myEntry &&
									!pageEntries.find((e) => e.address === connectedAddress) && (
										<>
											<tr>
												<td colSpan={5} className="h-px bg-brand-cyan/20" />
											</tr>
											<LeaderboardRow
												entry={myEntry}
												isMine={true}
												onClick={() => navigate(`/profile/${myEntry.address}`)}
												isMyRankBanner={true}
											/>
										</>
									)}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* My Rank Connect Prompt */}
			{!connectedAddress && !isLoading && (
				<div className="mt-4 py-3 px-5 glass rounded-xl border border-white/10 text-center text-xs text-white/30 font-medium">
					{t("pages.leaderboard.connectPrompt")}
				</div>
			)}

			{/* Pagination */}
			{!isLoading && filtered.length > 0 && (
				<div className="flex items-center justify-between mt-6">
					<span className="text-xs text-white/30 font-medium">
						{t("pages.leaderboard.page", { current: page, total: totalPages })}
					</span>
					<div className="flex gap-3">
						<button
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
							className="px-5 py-2 glass rounded-xl border border-white/10 text-xs font-black uppercase tracking-widest
								text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
						>
							{t("pages.leaderboard.prev")}
						</button>
						<button
							onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							disabled={page === totalPages}
							className="px-5 py-2 glass rounded-xl border border-white/10 text-xs font-black uppercase tracking-widest
								text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
						>
							{t("pages.leaderboard.next")}
						</button>
					</div>
				</div>
			)}
		</div>
	)
}

export default Leaderboard
