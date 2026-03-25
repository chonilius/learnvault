import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useWallet } from "../hooks/useWallet"

interface LeaderboardEntry {
	rank: number
	address: string
	fullAddress: string
	balance: string
	completedCourses: number
}

const Leaderboard: React.FC = () => {
	const { t } = useTranslation()
	const { address: currentUserAddress } = useWallet()
	const [leaders, setLeaders] = useState<LeaderboardEntry[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const fetchLeaderboard = async () => {
			try {
				// In production, this URL should come from an environment variable
				const response = await fetch("http://localhost:4000/api/leaderboard?limit=25")
				if (!response.ok) throw new Error("Failed to fetch leaderboard")
				const result = await response.json()
				setLeaders(result.data)
			} catch (err) {
				console.error(err)
				setError("Unable to load rankings. Please try again later.")
			} finally {
				setIsLoading(false)
			}
		}

		fetchLeaderboard()
	}, [])

	const isCurrentUser = (fullAddress: string) => {
		return currentUserAddress?.toLowerCase() === fullAddress.toLowerCase()
	}

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

			{isLoading ? (
				<div className="glass-card p-20 rounded-[4rem] text-center border border-white/5">
					<div className="text-6xl mb-8 animate-bounce">🏆</div>
					<h2 className="text-3xl font-black mb-4">Synchronizing Data</h2>
					<p className="text-white/40 max-w-md mx-auto mb-10 leading-relaxed font-medium">
						Retrieving real-time scholar rankings from the Stellar network...
					</p>
					<div className="flex justify-center gap-3">
						<div className="w-3 h-3 bg-brand-cyan rounded-full animate-pulse" />
						<div className="w-3 h-3 bg-brand-blue rounded-full animate-pulse delay-75" />
						<div className="w-3 h-3 bg-brand-purple rounded-full animate-pulse delay-150" />
					</div>
				</div>
			) : error ? (
				<div className="glass-card p-20 rounded-[4rem] text-center border border-red-500/20 bg-red-500/5">
					<div className="text-6xl mb-8">⚠️</div>
					<h2 className="text-3xl font-black mb-4 text-red-400">Connection Error</h2>
					<p className="text-white/60 max-w-md mx-auto mb-6 font-medium">
						{error}
					</p>
					<button 
						onClick={() => window.location.reload()}
						className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-full font-bold transition-all"
					>
						Try Again
					</button>
				</div>
			) : leaders.length === 0 ? (
				<div className="glass-card p-20 rounded-[4rem] text-center border border-white/5">
					<div className="text-6xl mb-8">🌑</div>
					<h2 className="text-3xl font-black mb-4">Empty Leaderboard</h2>
					<p className="text-white/40 max-w-md mx-auto font-medium">
						No scholars have earned LRN tokens yet. Be the first to complete a course!
					</p>
				</div>
			) : (
				<div className="glass-card overflow-hidden rounded-[2.5rem] border border-white/5 shadow-2xl">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="bg-white/5 border-b border-white/5">
								<th className="py-6 px-8 text-sm font-bold uppercase tracking-widest text-white/40">Rank</th>
								<th className="py-6 px-8 text-sm font-bold uppercase tracking-widest text-white/40">Scholar</th>
								<th className="py-6 px-8 text-sm font-bold uppercase tracking-widest text-white/40 text-right">LRN Balance</th>
								<th className="py-6 px-8 text-sm font-bold uppercase tracking-widest text-white/40 text-right">Milestones</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-white/5">
							{leaders.map((leader) => (
								<tr 
									key={leader.fullAddress}
									className={`group hover:bg-white/[0.02] transition-colors ${
										isCurrentUser(leader.fullAddress) ? "bg-brand-cyan/10" : ""
									}`}
								>
									<td className="py-6 px-8">
										<div className={`
											w-10 h-10 rounded-full flex items-center justify-center font-black text-lg
											${leader.rank === 1 ? "bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.3)]" : 
											  leader.rank === 2 ? "bg-slate-300 text-black" : 
											  leader.rank === 3 ? "bg-amber-600 text-black" : 
											  "bg-white/10 text-white/60"}
										`}>
											{leader.rank}
										</div>
									</td>
									<td className="py-6 px-8 overflow-hidden">
										<div className="flex items-center gap-4">
											<div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-cyan to-brand-purple flex-shrink-0 opacity-80" />
											<div>
												<div className="font-bold text-white group-hover:text-brand-cyan transition-colors">
													{leader.address}
												</div>
												{isCurrentUser(leader.fullAddress) && (
													<span className="text-[10px] uppercase font-black tracking-tighter text-brand-cyan bg-brand-cyan/10 px-2 py-0.5 rounded">
														You
													</span>
												)}
											</div>
										</div>
									</td>
									<td className="py-6 px-8 text-right">
										<div className="text-2xl font-black text-brand-cyan">
											{leader.balance}
											<span className="text-xs ml-1 text-white/20 uppercase">LRN</span>
										</div>
									</td>
									<td className="py-6 px-8 text-right">
										<div className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
											<span className="text-white/60 font-medium">{leader.completedCourses}</span>
											<span className="w-2 h-2 bg-brand-purple rounded-full" />
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
					
					<div className="p-8 bg-white/5 border-t border-white/5 flex justify-between items-center">
						<div className="text-sm font-medium text-white/40">
							Showing {leaders.length} top learners
						</div>
						<div className="text-[10px] uppercase tracking-widest font-black text-white/20">
							Updated every block
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default Leaderboard
