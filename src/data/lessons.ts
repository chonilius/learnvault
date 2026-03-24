export interface Lesson {
	id: number
	courseId: string
	title: string
	content: string
}

const placeholderContent = `
# Welcome to this Lesson!

This is a placeholder markdown content for this lesson. In a real environment, this content would be fetched from a CMS or a specialized markdown file.

## Learning Objectives
1. Understand the core concepts of this track.
2. Complete the interactive milestone.
3. Earn your on-chain reward.

### Next Steps
When you feel ready, click the **Mark as Complete** button at the bottom of the page to register your progress on the Soroban smart contract and receive your tokens!
`

export const lessons: Lesson[] = [
	{ id: 1, courseId: "web3-fundamentals", title: "What makes ownership portable on the internet?", content: placeholderContent },
	{ id: 2, courseId: "web3-fundamentals", title: "Wallets vs Accounts", content: placeholderContent },
	{ id: 3, courseId: "web3-fundamentals", title: "Signing your first transaction", content: placeholderContent },
	{ id: 1, courseId: "defi-protocols", title: "How liquidity pools turn deposits into markets", content: placeholderContent },
	{ id: 2, courseId: "defi-protocols", title: "Automated Market Makers (AMMs)", content: placeholderContent },
	{ id: 1, courseId: "smart-contract-foundations", title: "State, events, and the contract execution lifecycle", content: placeholderContent },
	{ id: 2, courseId: "smart-contract-foundations", title: "Writing a basic storage contract", content: placeholderContent },
	{ id: 1, courseId: "stellar-soroban-basics", title: "Your first Stellar transaction on testnet", content: placeholderContent },
	{ id: 2, courseId: "stellar-soroban-basics", title: "Deploying a Soroban contract", content: placeholderContent },
]

export const getCourseLessons = (courseId: string): Lesson[] => {
	return lessons.filter((lesson) => lesson.courseId === courseId).sort((a, b) => a.id - b.id)
}

export const getLesson = (courseId: string, lessonId: number): Lesson | undefined => {
	return lessons.find((lesson) => lesson.courseId === courseId && lesson.id === lessonId)
}
