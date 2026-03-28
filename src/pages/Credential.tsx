import React, { useState, useEffect } from "react"
import { Helmet } from "react-helmet"
import { useParams, Link } from "react-router-dom"
import TxHashLink from "../components/TxHashLink"

const Credential: React.FC = () => {
	const { id } = useParams<{ id: string }>()
	const [copySuccess, setCopySuccess] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	// Simulate API call to fetch credential data
	useEffect(() => {
		const fetchCredential = async () => {
			setIsLoading(true)
			setError(null)
			
			try {
				// Simulate API delay
				await new Promise(resolve => setTimeout(resolve, 1000))
				
				// Validate ID format (basic check)
				if (!id || isNaN(Number(id))) {
					throw new Error("Invalid credential ID")
				}
				
				// For demo purposes, we'll use mock data
				// In a real implementation, this would fetch from /api/credentials/:id
				if (id === "999") {
					throw new Error("Credential not found or revoked")
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load credential")
			} finally {
				setIsLoading(false)
			}
		}
		
		if (id) {
			fetchCredential()
		} else {
			setError("No credential ID provided")
			setIsLoading(false)
		}
	}, [id])

	// Mock credential data - in production this would come from API
	const nft = {
		id: id || "1",
		programName: "Soroban Smart Contract Masterclass",
		scholarName: "Alex Rivera",
		completionDate: "October 24, 2024",
		artworkUrl: "https://api.placeholder.com/600/600?text=ScholarNFT+Badge",
		txHash: "3f40a5c6f2e1471fa3f31ba6b59f7f0dcefc36e35d5b12fb96f0c8d9f6a8b4e1",
		issuer: "LearnVault DAO",
		reputationPoints: "50 LRN",
		learnerAddress: "GD5V5B3X4K3X2Y7Z8W9Q1R2T3Y4U5I6O7P8Q9R0S1T",
		metadataUri: "ipfs://QmXyZ123..."
	}

	const siteUrl = "https://learnvault.app"
	const title = error ? "Credential Not Found — LearnVault" : `${nft.scholarName} earned "${nft.programName}" — LearnVault`
	const description = error ? "The requested credential could not be found or has been revoked." : `${nft.scholarName} completed "${nft.programName}" on ${nft.completionDate} and earned a verified ScholarNFT credential on LearnVault.`

	// Loading state
	if (isLoading) {
		return (
			<div className="py-20 px-6 min-h-screen flex flex-col items-center justify-center text-white">
				<div className="glass-card rounded-[2.5rem] p-12 animate-pulse">
					<div className="w-32 h-32 bg-white/10 rounded-full mb-8" />
					<div className="h-8 w-64 bg-white/10 rounded-full mb-4" />
					<div className="h-4 w-48 bg-white/10 rounded-full" />
				</div>
			</div>
		)
	}

	// Error state
	if (error) {
		return (
			<div className="py-20 px-6 min-h-screen flex flex-col items-center justify-center text-white">
				<Helmet>
					<title>{title}</title>
					<meta property="og:title" content={title} />
					<meta property="og:description" content={description} />
				</Helmet>
				<div className="glass-card rounded-[2.5rem] p-12 max-w-2xl text-center">
					<div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
						<span className="text-2xl">⚠️</span>
					</div>
					<h1 className="text-3xl font-black mb-4">Credential Not Found</h1>
					<p className="text-white/70 mb-8">{error}</p>
					<Link
						to="/profile"
						className="inline-flex items-center gap-2 px-8 py-3 bg-brand-cyan text-black rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all"
					>
						← Back to Profile
					</Link>
				</div>
			</div>
		)
	}

	const copyToClipboard = () => {
		void navigator.clipboard.writeText(window.location.href).catch(() => {})
		setCopySuccess(true)
		setTimeout(() => setCopySuccess(false), 2000)
	}

	return (
		<div className="py-20 px-6 min-h-screen flex flex-col items-center gap-16 text-white relative overflow-hidden">
			<div className="absolute top-1/4 left-1/4 w-[50%] h-[50%] bg-brand-cyan/10 blur-[150px] rounded-full -z-10" />
			<div className="absolute bottom-1/4 right-1/4 w-[50%] h-[50%] bg-brand-purple/10 blur-[150px] rounded-full -z-10" />

			<div className="iridescent-border p-px rounded-[3rem] shadow-2xl animate-in fade-in zoom-in duration-1000">
				<div className="glass-card w-full max-w-5xl rounded-[3rem] overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/10">
					<div className="md:w-5/12 relative aspect-square md:aspect-auto group">
						<img
							src={nft.artworkUrl}
							alt={`Credential artwork for ${nft.programName} awarded to ${nft.scholarName}`}
							className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-1000"
						/>
						<div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent" />
						<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 px-8 py-3 border-[6px] border-brand-cyan text-brand-cyan font-black text-2xl tracking-[6px] bg-black/40 backdrop-blur-md whitespace-nowrap uppercase shadow-2xl">
							Verified Scholar
						</div>
						<div className="absolute bottom-8 left-8">
							<p className="text-[10px] font-black uppercase tracking-[3px] text-white/70 mb-1">
								Authenticity Hash
							</p>
							<code className="text-[10px] text-brand-emerald font-mono bg-black/50 px-2 py-1 rounded">
								LV-NFT-{nft.id}-Soroban-2024
							</code>
						</div>
					</div>

					<div className="md:w-7/12 p-16 flex flex-col justify-center">
						<div className="mb-10">
							<div className="flex items-center gap-3 mb-4">
								<span className="w-8 h-px bg-brand-cyan" />
								<span className="text-xs font-black uppercase tracking-[4px] text-brand-cyan">
									Official Credential
								</span>
							</div>
							<h1 className="text-5xl font-black mb-6 leading-tight tracking-tighter">
								{nft.programName}
							</h1>
							<p className="text-white/70 text-lg font-medium leading-relaxed">
								This on-chain certificate verifies that{" "}
								<span className="text-white font-bold">{nft.scholarName}</span>{" "}
								has successfully mastered the complexities of Soroban smart
								contract development.
							</p>
						</div>

						<div className="grid grid-cols-2 gap-10 mb-12">
							<div>
								<p className="block text-[10px] uppercase font-black text-white/70 tracking-[3px] mb-2">
									Awarded Date
								</p>
								<p className="text-lg font-bold">{nft.completionDate}</p>
							</div>
							<div>
								<p className="block text-[10px] uppercase font-black text-white/70 tracking-[3px] mb-2">
									Reputation Earned
								</p>
								<p className="text-lg font-black text-brand-emerald">
									+{nft.reputationPoints}
								</p>
							</div>
							<div className="col-span-2">
								<p className="block text-[10px] uppercase font-black text-white/70 tracking-[3px] mb-2">
									Issued By
								</p>
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-full bg-linear-to-r from-brand-cyan to-brand-blue" />
									<p className="text-lg font-bold text-gradient">
										{nft.issuer}
									</p>
								</div>
							</div>
							<div className="col-span-2">
								<p className="block text-[10px] uppercase font-black text-white/70 tracking-[3px] mb-2">
									Learner Address
								</p>
								<code className="text-xs font-mono bg-black/50 px-3 py-2 rounded-lg text-brand-emerald">
									{nft.learnerAddress}
								</code>
							</div>
							<div className="col-span-2">
								<p className="block text-[10px] uppercase font-black text-white/70 tracking-[3px] mb-2">
									Metadata URI
								</p>
								<code className="text-xs font-mono bg-black/50 px-3 py-2 rounded-lg text-white/70 break-all">
									{nft.metadataUri}
								</code>
							</div>
							<div className="col-span-2">
								<label className="block text-[10px] uppercase font-black text-white/30 tracking-[3px] mb-2">
									Transaction Hash
								</label>
								<TxHashLink
									hash={nft.txHash}
									className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#00d2ff] hover:underline"
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="flex flex-wrap justify-center gap-6 animate-in slide-in-from-bottom-8 duration-1000 delay-300">
				<a
					href={`https://stellar.expert/explorer/public/tx/${nft.txHash}`}
					target="_blank"
					rel="noopener noreferrer"
					className="px-10 py-4 bg-gradient-to-r from-brand-cyan to-brand-blue text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-cyan/20"
					aria-label={`Verify ${nft.programName} credential on Stellar Explorer`}
				>
					Verify on-chain →
				</a>
				<a
					href={`https://twitter.com/intent/tweet?text=I've just earned my ${nft.programName} credential on @LearnVault!`}
					className="px-10 py-4 bg-[#1d9bf0] text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#1d9bf0]/20"
					aria-label={`Share ${nft.programName} credential on Twitter`}
				>
					Share to Twitter / X
				</a>
				<button
					type="button"
					onClick={copyToClipboard}
					className="px-10 py-4 glass text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/10 hover:scale-105 active:scale-95 transition-all border border-white/10"
				>
					{copySuccess ? "Link Copied!" : "Copy Shareable Link"}
				</button>
			</div>
			{copySuccess && (
				<p
					className="text-sm text-brand-emerald"
					role="status"
					aria-live="polite"
				>
					Credential link copied to clipboard.
				</p>
			)}
		</div>
	)
}

export default Credential
