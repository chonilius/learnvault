import { Button } from "@stellar/design-system"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useWallet } from "../hooks/useWallet"
import { shortenContractId } from "../util/contract"
import {
	getProfileIdentity,
	loadProfileOnChainData,
	updateProfileIdentity,
} from "../util/profileData"
import styles from "./Profile.module.css"

const fmtDate = (iso: string) =>
	new Date(iso).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	})

const Profile: React.FC = () => {
	const { walletAddress } = useParams()
	const { address } = useWallet()
	const resolvedAddress = walletAddress || address
	const isOwnProfile = Boolean(address && resolvedAddress === address)

	const [editing, setEditing] = useState(false)
	const [bioDraft, setBioDraft] = useState("")
	const [avatarDraft, setAvatarDraft] = useState("")
	const [copied, setCopied] = useState(false)

	const identity = useMemo(
		() => (resolvedAddress ? getProfileIdentity(resolvedAddress) : null),
		[resolvedAddress],
	)

	const { data, isLoading } = useQuery({
		queryKey: ["profile", resolvedAddress],
		queryFn: () => loadProfileOnChainData(resolvedAddress as string),
		enabled: Boolean(resolvedAddress),
	})

	if (!resolvedAddress) {
		return (
			<div className={styles.Profile}>
				<h1>Profile</h1>
				<p className={styles.Muted}>
					Connect your wallet to view your own profile at <code>/profile</code>,
					or open a public profile URL like <code>/profile/G...</code>.
				</p>
			</div>
		)
	}

	const profileUrl = `${window.location.origin}/profile/${resolvedAddress}`

	const startEdit = () => {
		setBioDraft(identity?.bio ?? "")
		setAvatarDraft(identity?.avatarUrl ?? "")
		setEditing(true)
	}

	const saveEdit = () => {
		updateProfileIdentity(resolvedAddress, {
			bio: bioDraft,
			avatarUrl: avatarDraft || undefined,
		})
		setEditing(false)
	}

	const copyUrl = async () => {
		await navigator.clipboard.writeText(profileUrl)
		setCopied(true)
		setTimeout(() => setCopied(false), 1800)
	}

	return (
		<div className={styles.Profile}>
			<div className={styles.Header}>
				<div>
					<h1>Learner Profile</h1>
					<div className={styles.Wallet}>{resolvedAddress}</div>
				</div>
				<div className={styles.InlineActions}>
					<Button variant="secondary" size="sm" onClick={copyUrl}>
						{copied ? "Copied" : "Copy URL"}
					</Button>
					{isOwnProfile && !editing && (
						<Button variant="tertiary" size="sm" onClick={startEdit}>
							Edit Profile
						</Button>
					)}
				</div>
			</div>

			<div className={styles.Grid}>
				<section className={styles.Card}>
					<h3>Identity</h3>
					{editing ? (
						<>
							<label>
								Avatar URL (IPFS gateway URL)
								<input
									className={styles.Input}
									value={avatarDraft}
									onChange={(e) => setAvatarDraft(e.target.value)}
									placeholder="https://... or ipfs://..."
								/>
							</label>
							<label>
								Bio
								<textarea
									className={styles.Textarea}
									value={bioDraft}
									onChange={(e) => setBioDraft(e.target.value)}
									maxLength={320}
								/>
							</label>
							<div className={styles.InlineActions}>
								<Button variant="secondary" size="sm" onClick={saveEdit}>
									Save
								</Button>
								<Button
									variant="tertiary"
									size="sm"
									onClick={() => setEditing(false)}
								>
									Cancel
								</Button>
							</div>
						</>
					) : (
						<>
							<div className={styles.IdentityRow}>
								{identity?.avatarUrl ? (
									<img
										src={identity.avatarUrl}
										alt="Profile avatar"
										className={styles.Avatar}
									/>
								) : (
									<div className={styles.Avatar} />
								)}
								<div>
									<div>{shortenContractId(resolvedAddress, 8, 8)}</div>
									<div className={styles.Muted}>
										Joined{" "}
										{fmtDate(identity?.joinDateIso ?? new Date().toISOString())}
									</div>
								</div>
							</div>
							<p className={styles.Muted}>{identity?.bio || "No bio yet."}</p>
						</>
					)}
				</section>

				<section className={styles.Card}>
					<h3>Reputation Score</h3>
					{isLoading ? (
						<div className={styles.Skeleton} />
					) : (
						<>
							<div>
								<strong>{data?.reputationScore ?? 0}</strong> LRN
							</div>
							<div className={styles.Muted}>
								Percentile rank: {data?.percentile ?? 0}%
							</div>
						</>
					)}
				</section>

				<section className={styles.Card}>
					<h3>Skill Tracks Completed</h3>
					{isLoading ? (
						<div className={styles.Skeleton} />
					) : data?.skillTracks.length ? (
						<ul className={styles.List}>
							{data.skillTracks.map((item) => (
								<li key={item.id} className={styles.ListItem}>
									<div>{item.title}</div>
									<div className={styles.Muted}>
										{fmtDate(item.completedAt)}
									</div>
								</li>
							))}
						</ul>
					) : (
						<p className={styles.Muted}>No completed tracks yet.</p>
					)}
				</section>

				<section className={styles.Card}>
					<h3>ScholarNFT Credentials</h3>
					{isLoading ? (
						<div className={styles.Skeleton} />
					) : data?.credentials.length ? (
						<div className={styles.NftGrid}>
							{data.credentials.map((nft) => (
								<div key={nft.id} className={styles.NftTile}>
									{nft.imageUrl ? (
										<img src={nft.imageUrl} alt={nft.title} />
									) : null}
									<div>{nft.title}</div>
									<div className={styles.Muted}>{fmtDate(nft.earnedAt)}</div>
								</div>
							))}
						</div>
					) : (
						<p className={styles.Muted}>No credential NFTs yet.</p>
					)}
				</section>

				<section className={styles.Card}>
					<h3>Scholarship History</h3>
					{isLoading ? (
						<div className={styles.Skeleton} />
					) : data?.scholarships.length ? (
						<ul className={styles.List}>
							{data.scholarships.map((proposal) => (
								<li key={proposal.id} className={styles.ListItem}>
									<div>{proposal.title}</div>
									<div className={styles.Muted}>
										{proposal.status} • {fmtDate(proposal.updatedAt)}
									</div>
								</li>
							))}
						</ul>
					) : (
						<p className={styles.Muted}>No scholarship proposals found.</p>
					)}
				</section>

				<section className={styles.Card}>
					<h3>Activity Feed</h3>
					{isLoading ? (
						<div className={styles.Skeleton} />
					) : data?.activity.length ? (
						<ul className={styles.List}>
							{data.activity.map((event) => (
								<li key={event.id} className={styles.ListItem}>
									<div>{event.description}</div>
									<div className={styles.Muted}>{fmtDate(event.timestamp)}</div>
								</li>
							))}
						</ul>
					) : (
						<p className={styles.Muted}>No recent on-chain events found.</p>
					)}
				</section>
			</div>

			{!isOwnProfile && address && (
				<p className={styles.Muted}>
					Viewing public profile. Go to <Link to="/profile">your profile</Link>.
				</p>
			)}
		</div>
	)
}

export default Profile
