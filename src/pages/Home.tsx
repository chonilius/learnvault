import { Button, Icon } from "@stellar/design-system"
import React, { lazy, Suspense } from "react"
import { Helmet } from "react-helmet"
import { Link } from "react-router-dom"
import DeferredSection from "../components/DeferredSection"
import { useEnrolledCourses } from "../hooks/useCourses"

const MilestoneTracker = lazy(() =>
	import("../components/MilestoneTracker").then((module) => ({
		default: module.MilestoneTracker,
	})),
)

const HOW_IT_WORKS = [
	{
		step: "01",
		title: "Learn",
		description:
			"Complete courses and skill tracks. Every milestone you finish earns LRN tokens on-chain — proof of real effort, not speculation.",
		icon: "📚",
	},
	{
		step: "02",
		title: "Earn",
		description:
			"Build your on-chain reputation. Accumulate LRN tokens to unlock DAO voting rights and become a governance participant.",
		icon: "🏆",
	},
	{
		step: "03",
		title: "Get Funded",
		description:
			"Apply for community scholarships. Approved funds are released in USDC milestones — no gatekeepers, just proof of effort.",
		icon: "💰",
	},
]

const STATS = [
	{ label: "Core Contracts", value: "6" },
	{ label: "Skill Tracks", value: "3" },
	{ label: "Built on", value: "Stellar" },
]

const Home: React.FC = () => {
	const { enrolledCourses, isLoading: isLoadingCourses } = useEnrolledCourses()

	const siteUrl = "https://learnvault.app"
	const title = "LearnVault — Learning is the proof of work"
	const description =
		"A decentralized learn-and-earn platform on Stellar. Complete courses, earn LRN tokens, and apply for community-funded scholarships."

	return (
		<>
			<Helmet>
				<title>{title}</title>
				<meta property="og:title" content={title} />
				<meta property="og:description" content={description} />
				<meta property="og:image" content={`${siteUrl}/og-image.png`} />
				<meta property="og:url" content={siteUrl} />
				<meta name="twitter:card" content="summary_large_image" />
			</Helmet>

			<div className="min-h-screen flex flex-col items-center py-20 px-6 relative overflow-hidden">
				{/* Background effects */}
				<div className="absolute top-0 left-0 w-full h-full animate-mesh opacity-30 -z-20" />
				<div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-brand-cyan/20 blur-[150px] rounded-full -z-10 animate-pulse" />
				<div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-brand-purple/20 blur-[150px] rounded-full -z-10 animate-pulse delay-700" />

				{/* Hero */}
				<header className="text-center max-w-4xl mx-auto mb-24">
					<div className="inline-block mb-10 animate-in fade-in zoom-in duration-1000">
						<div className="w-24 h-24 bg-linear-to-br from-brand-cyan to-brand-blue rounded-[2.5rem] flex items-center justify-center font-black text-3xl shadow-2xl shadow-brand-cyan/30 rotate-12 hover:rotate-0 transition-transform duration-500">
							LV
						</div>
					</div>

					<h1 className="text-7xl md:text-8xl font-black mb-8 tracking-tighter text-gradient leading-[0.9] animate-in slide-in-from-bottom-12 duration-1000 delay-200">
						Learning is the proof of work.
						<br />
						The community is the bank.
					</h1>
					<p className="text-xl md:text-2xl text-white/50 mb-12 max-w-2xl mx-auto font-medium leading-relaxed animate-in slide-in-from-bottom-12 duration-1000 delay-400">
						Earn on-chain credentials by completing courses. Get funded by a DAO
						that believes in your potential.
					</p>
					<div className="flex flex-wrap justify-center gap-6 animate-in slide-in-from-bottom-12 duration-1000 delay-600">
						<Link
							to="/courses"
							className="iridescent-border px-12 py-5 rounded-2xl font-black text-lg uppercase tracking-widest hover:scale-105 active:scale-95 transition-all group relative overflow-hidden shadow-2xl shadow-brand-cyan/20"
						>
							<span className="relative z-10">Start Learning</span>
						</Link>
						<Link
							to="/treasury"
							className="px-12 py-5 glass text-white rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-white/10 hover:scale-105 active:scale-95 transition-all border border-white/10"
						>
							Fund a Scholar
						</Link>
					</div>
				</header>

				{/* Stats bar */}
				<div className="flex flex-wrap justify-center gap-12 mb-24 animate-in fade-in duration-1000 delay-700">
					{STATS.map(({ label, value }) => (
						<div key={label} className="text-center">
							<p className="text-4xl font-black text-brand-cyan">{value}</p>
							<p className="text-sm text-white/40 uppercase tracking-widest mt-1">
								{label}
							</p>
						</div>
					))}
				</div>

				<main className="w-full max-w-6xl flex flex-col gap-12 relative z-10 animate-in slide-in-from-bottom-12 duration-1000 delay-800">
					{/* How It Works */}
					<section className="glass-card p-12 rounded-[3.5rem] border border-white/10 shadow-2xl">
						<h2 className="text-3xl font-black mb-10 flex items-center gap-4">
							<Icon.Lightbulb01 size="lg" className="text-brand-cyan" />
							How It Works
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
							{HOW_IT_WORKS.map(({ step, title, description, icon }) => (
								<div key={step} className="flex flex-col gap-4">
									<div className="text-4xl">{icon}</div>
									<p className="text-xs font-black text-brand-cyan uppercase tracking-widest">
										Step {step}
									</p>
									<h3 className="text-2xl font-black">{title}</h3>
									<p className="text-white/40 leading-relaxed">{description}</p>
								</div>
							))}
						</div>
					</section>

					{/* Course Progress — only shown when enrolled */}
					{!isLoadingCourses && enrolledCourses.length > 0 && (
						<div className="iridescent-border p-[1px] rounded-[3.5rem] shadow-2xl">
							<div className="glass-card p-12 rounded-[3.5rem] border border-white/5">
								<div className="flex flex-col md:flex-row gap-12 items-start">
									<div className="md:w-1/3">
										<h2 className="text-3xl font-black mb-4 flex items-center gap-4">
											<Icon.Trophy01 size="lg" className="text-brand-cyan" />
											Your Progress
										</h2>
										<p className="text-white/40 leading-relaxed">
											Track your enrolled courses and milestone completions.
										</p>
									</div>
									<div className="md:w-2/3 w-full flex flex-col gap-8">
										{enrolledCourses.map((course) => (
											<div key={course.courseId}>
												<div className="flex items-center justify-between mb-2">
													<span className="font-semibold text-white/80">
														{course.title}
													</span>
													<span className="text-sm text-white/40">
														{course.completedCount}/{course.totalCount}{" "}
														milestones
													</span>
												</div>
												<div className="w-full h-2 bg-white/10 rounded-full mb-4">
													<div
														className="h-2 bg-brand-cyan rounded-full transition-all"
														style={{ width: `${course.progressPercent}%` }}
													/>
												</div>
												<DeferredSection
													fallback={<SectionSkeleton className="min-h-40" />}
												>
													<Suspense
														fallback={<SectionSkeleton className="min-h-40" />}
													>
														<MilestoneTracker
															courseId={course.courseId}
															milestones={course.milestones}
														/>
													</Suspense>
												</DeferredSection>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Feature cards */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						<FeatureCard
							icon="🎓"
							title="ScholarNFTs"
							description="Your hard-earned expertise, permanently immortalized as verifiable credentials on the Stellar network."
						/>
						<FeatureCard
							icon="💸"
							title="Automated Funding"
							description="Decentralized treasury disbursements triggered instantly upon milestone completion via Soroban contracts."
						/>
						<FeatureCard
							icon="🏛️"
							title="Community DAO"
							description="A protocol governed by the scholars who use it. Vote on curriculum, treasury, and reputation standards."
						/>
					</div>

					{/* CTA banner */}
					<div className="glass-card p-10 rounded-[3rem] border border-brand-cyan/20 text-center shadow-2xl">
						<h2 className="text-3xl font-black mb-4">
							Join the open-source sprint
						</h2>
						<p className="text-white/40 mb-6 max-w-xl mx-auto">
							LearnVault is built in the open. Pick an issue, ship a feature,
							and earn your place in the contributor list.
						</p>
						<Link
							to="https://github.com/bakeronchain/learnvault/issues"
							target="_blank"
						>
							<Button variant="secondary" size="lg">
								View Open Issues
								<Icon.ArrowUpRight size="md" />
							</Button>
						</Link>
					</div>
				</main>
			</div>
		</>
	)
}

const FeatureCard: React.FC<{
	icon: string
	title: string
	description: string
}> = ({ icon, title, description }) => (
	<div className="glass-card p-10 rounded-[3rem] hover:border-white/20 transition-all hover:-translate-y-4 group">
		<div className="text-4xl mb-6 group-hover:scale-125 transition-transform duration-500">
			{icon}
		</div>
		<h3 className="text-2xl font-black mb-4 tracking-tight">{title}</h3>
		<p className="text-white/40 leading-relaxed font-medium">{description}</p>
	</div>
)

const SectionSkeleton = ({ className = "" }: { className?: string }) => (
	<div
		className={`glass-card animate-pulse rounded-[2rem] border border-white/5 bg-white/5 ${className}`.trim()}
	/>
)

export default Home
