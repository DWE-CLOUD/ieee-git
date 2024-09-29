import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, GitCommit, ExternalLink, Users, Code, Calendar } from 'lucide-react';

const GitHubWatcher = () => {
    const [profiles, setProfiles] = useState([]);
    const [newProfiles, setNewProfiles] = useState('');
    const [activities, setActivities] = useState([]);
    const [errors, setErrors] = useState({});
    const [token, setToken] = useState('');
    const [rateLimit, setRateLimit] = useState(null);

    const headers = token ? { Authorization: `token ${token}` } : {};

    useEffect(() => {
        const fetchData = async () => {
            const newActivities = [];
            const newErrors = {};

            try {
                const rateLimitResponse = await fetch('https://api.github.com/rate_limit', { headers });
                const rateLimitData = await rateLimitResponse.json();
                setRateLimit(rateLimitData.resources.core);

                if (rateLimitData.resources.core.remaining === 0) {
                    setErrors({ global: 'API rate limit exceeded. Please wait or add a Personal Access Token.' });
                    return;
                }
            } catch (error) {
                setErrors({ global: 'Error checking rate limit: ' + error.message });
                return;
            }

            for (const profile of profiles) {
                try {
                    const userResponse = await fetch(`https://api.github.com/users/${profile}`, { headers });
                    if (!userResponse.ok) {
                        throw new Error(`User ${profile} not found`);
                    }
                    const userData = await userResponse.json();

                    const reposResponse = await fetch(`https://api.github.com/users/${profile}/repos?sort=created&direction=desc`, { headers });
                    const repos = await reposResponse.json();

                    if (repos.length === 0) {
                        newErrors[profile] = `No public repositories found for ${profile}`;
                        continue;
                    }

                    const sinceDate = new Date(2024, 8, 27);
                    sinceDate.setHours(0, 0, 0, 0);

                    for (const repo of repos) {
                        const commitsResponse = await fetch(`https://api.github.com/repos/${profile}/${repo.name}/commits?since=${sinceDate.toISOString()}`, { headers });
                        const commits = await commitsResponse.json();

                        if (commits.length > 0) {
                            newActivities.push({
                                type: 'activity',
                                profile,
                                repo: repo.name,
                                repoUrl: repo.html_url,
                                productionUrl: repo.homepage || null,
                                techStack: repo.language,
                                commits: commits.map(commit => ({
                                    message: commit.commit.message,
                                    date: new Date(commit.commit.author.date),
                                    commitUrl: commit.html_url,
                                })),
                                repoCount: userData.public_repos,
                                lastUpdated: new Date(Math.max(...commits.map(c => new Date(c.commit.author.date)))),
                                creationDate: new Date(repo.created_at),
                            });
                        }
                    }
                } catch (error) {
                    newErrors[profile] = error.message;
                }
            }
            setActivities(newActivities);
            setErrors(newErrors);
        };

        if (profiles.length > 0) {
            fetchData();
            const interval = setInterval(fetchData, 100000);
            return () => clearInterval(interval);
        }
    }, [profiles, token]);

    const handleAddProfiles = (e) => {
        e.preventDefault();
        const profileList = newProfiles.split(',').map(p => p.trim()).filter(p => p && !profiles.includes(p));
        if (profileList.length > 0) {
            setProfiles(prev => [...prev, ...profileList]);
            setNewProfiles('');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 text-white font-sans p-8">
            <motion.h1
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="text-5xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600"
            >
                GitHub Activity Watcher
            </motion.h1>

            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-8 flex justify-center gap-4 flex-wrap"
            >
                <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter GitHub Personal Access Token (optional)"
                    className="px-4 py-2 rounded-full w-full max-w-md bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 transition duration-300"
                />
            </motion.div>

            <motion.form
                onSubmit={handleAddProfiles}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-8 flex justify-center gap-4 flex-wrap"
            >
                <input
                    type="text"
                    value={newProfiles}
                    onChange={(e) => setNewProfiles(e.target.value)}
                    placeholder="Enter GitHub usernames (comma-separated)"
                    className="px-4 py-2 rounded-full w-full max-w-md bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 transition duration-300"
                />
                <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition duration-300"
                >
                    Add Profiles
                </motion.button>
            </motion.form>

            {rateLimit && (
                <p className="text-center mb-4 text-gray-400">
                    API Rate Limit: {rateLimit.remaining} / {rateLimit.limit} (Resets at {new Date(rateLimit.reset * 1000).toLocaleTimeString()})
                </p>
            )}

            {Object.entries(errors).map(([profile, error]) => (
                <p key={profile} className="text-red-400 text-center mb-2">
                    {error}
                </p>
            ))}

            <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
                <AnimatePresence>
                    {activities.map((activity, index) => (
                        <motion.div
                            key={index}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="bg-gray-800 rounded-lg p-6 shadow-lg hover:shadow-2xl transition duration-300 overflow-hidden relative"
                        >
                            <h3 className="text-xl font-bold mb-2 text-blue-400 flex items-center">
                                <Users className="mr-2" size={20} />
                                {activity.profile}
                            </h3>
                            <h2 className="text-lg font-semibold mb-2 text-purple-400 flex items-center">
                                <GitBranch className="mr-2" size={18} />
                                <a href={activity.repoUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                    {activity.repo}
                                </a>
                            </h2>

                            {activity.productionUrl && (
                                <p className="mb-4 text-gray-300 flex items-center">
                                    <ExternalLink className="mr-2" size={16} />
                                    <a href={activity.productionUrl} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition duration-300">
                                        {activity.productionUrl}
                                    </a>
                                </p>
                            )}

                            <p className="mb-4 text-gray-400 flex items-center">
                                <Code className="mr-2" size={16} />
                                {activity.techStack || 'Unknown'}
                            </p>

                            <p className="mb-2 font-semibold text-gray-200">
                                Commit History (since 27/9/24):
                            </p>
                            <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                                {activity.commits.map((commit, idx) => (
                                    <motion.div
                                        key={idx}
                                        className="bg-gray-700 p-2 rounded-md"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.3, delay: idx * 0.1 }}
                                    >
                                        <p className="text-gray-300">{commit.message}</p>
                                        <p className="text-gray-500 text-sm">
                                            {commit.date.toLocaleDateString()} {commit.date.toLocaleTimeString()} -{' '}
                                            <a href={commit.commitUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                                View Commit
                                            </a>
                                        </p>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default GitHubWatcher;
