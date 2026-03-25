import { Button, Icon, Layout } from "@stellar/design-system"
import { Routes, Route, Outlet, NavLink } from "react-router-dom"
import styles from "./App.module.css"
import { ComingSoon } from "./components/ComingSoon"
import ConnectAccount from "./components/ConnectAccount"
import CourseCard from "./components/CourseCard"
import ErrorBoundary from "./components/ErrorBoundary"
import Footer from "./components/Footer"
import NavBar from "./components/NavBar"
import { labPrefix } from "./contracts/util"
import Admin from "./pages/Admin"
import Courses from "./pages/Courses"
import Credential from "./pages/Credential"
import Dao from "./pages/Dao"
import DaoProposals from "./pages/DaoProposals"
import DaoPropose from "./pages/DaoPropose"
import Dashboard from "./pages/Dashboard"
import Debug from "./pages/Debug"
import Donor from "./pages/Donor"
import Home from "./pages/Home"
import Leaderboard from "./pages/Leaderboard"
import Learn from "./pages/Learn"
import LessonView from "./pages/LessonView"
import NotFound from "./pages/NotFound"
import Profile from "./pages/Profile"

const CourseCatalog = () => (
	<div style={{ padding: "24px" }}>
		<h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "24px" }}>
			Course Catalog
		</h1>
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
				gap: "24px",
			}}
		>
			<CourseCard
				id="1"
				title="Soroban Smart Contracts"
				description="Learn how to build scalable decentralized apps on Stellar using Rust and Soroban."
				difficulty="intermediate"
				estimatedHours={5}
				lrnReward={200}
				lessonCount={12}
				isEnrolled={false}
				onEnroll={() => alert("Enrolled in Soroban!")}
			/>
			<CourseCard
				id="2"
				title="DeFi Fundamentals"
				description="Understand the core concepts of Decentralized Finance and automated market makers."
				difficulty="beginner"
				estimatedHours={3}
				lrnReward={100}
				lessonCount={8}
				isEnrolled={true}
			/>
		</div>
	</div>
)
import ScholarshipApply from "./pages/ScholarshipApply"
import Treasury from "./pages/Treasury"

function App() {
	return (
		<Routes>
			<Route element={<AppLayout />}>
				<Route path="/" element={<Home />} />
				<Route path="/courses" element={<CourseCatalog />} />
				<Route path="/profile" element={<Profile />} />
				<Route path="/profile/:walletAddress" element={<Profile />} />
				<Route path="/debug" element={<Debug />} />
				<Route path="/debug/:contractName" element={<Debug />} />
				<Route
					path="/"
					element={
						<ErrorBoundary>
							<Home />
						</ErrorBoundary>
					}
				/>
				<Route
					path="/courses"
					element={
						<ErrorBoundary>
							<Courses />
						</ErrorBoundary>
					}
				/>
				<Route
					path="/courses/:courseId/lessons/:lessonId"
					element={
						<ErrorBoundary>
							<LessonView />
						</ErrorBoundary>
					}
				/>
				<Route
					path="/learn"
					element={
						<ErrorBoundary>
							<Learn />
						</ErrorBoundary>
					}
				/>
				<Route
					path="/dao"
					element={
						<ErrorBoundary>
							<Dao />
						</ErrorBoundary>
					}
				/>
				<Route
					path="/dao/proposals"
					element={
						<ErrorBoundary>
							<DaoProposals />
						</ErrorBoundary>
					}
				/>
				<Route
					path="/leaderboard"
					element={
						<ErrorBoundary>
							<Leaderboard />
						</ErrorBoundary>
					}
				/>
				<Route
					path="/profile"
					element={
						<ErrorBoundary>
							<Profile />
						</ErrorBoundary>
					}
				/>
				<Route
					path="/profile/:walletAddress"
					element={
						<ErrorBoundary>
							<Profile />
						</ErrorBoundary>
					}
				/>
				<Route
					path="/scholarships/apply"
					element={
						<ErrorBoundary>
							<ScholarshipApply />
						</ErrorBoundary>
					}
				/>
				<Route
					path="/admin"
					element={
						<ErrorBoundary>
							<Admin />
						</ErrorBoundary>
					}
				/>
				<Route
					path="/treasury"
					element={
						<ErrorBoundary>
							<Treasury />
						</ErrorBoundary>
					}
				/>
				<Route
					path="/donor"
					element={
						<ErrorBoundary>
							<Donor />
						</ErrorBoundary>
					}
				/>
				<Route
					path="/credentials/:nftId"
					element={
						<ErrorBoundary>
							<Credential />
						</ErrorBoundary>
					}
				/>
				<Route
					path="/dashboard"
					element={
						<ErrorBoundary>
							<Dashboard />
						</ErrorBoundary>
					}
				/>
				<Route
					path="/debug"
					element={
						<ErrorBoundary>
							<Debug />
						</ErrorBoundary>
					}
				/>
				<Route
					path="/debug/:contractName"
					element={
						<ErrorBoundary>
							<Debug />
						</ErrorBoundary>
					}
				/>
				<Route
					path="*"
					element={
						<ErrorBoundary>
							<NotFound />
						</ErrorBoundary>
					}
				/>
			</Route>
		</Routes>
	)
}
const AppLayout: React.FC = () => (
	<div className="min-h-screen flex flex-col pt-24 overflow-x-hidden w-full max-w-full">
		<NavBar />
		<main className="flex-1 relative z-10">
			<Outlet />
		</main>
		<Footer />
	</div>
)

export default App
