import React, { useState } from 'react';
import { configManager } from '../../utils/config';
import { Layout, Check, ShieldCheck, Globe, Rocket } from 'lucide-react';

const StartupSetup: React.FC = () => {
    const [id, setId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Simple UUID validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        // Also allow non-standard UUIDs if provided by the user, but trim it.
        const trimmedId = id.trim();

        if (trimmedId.length < 10) {
            setError('Please enter a valid Restaurant ID.');
            return;
        }

        setLoading(true);
        try {
            configManager.setRestaurantId(trimmedId);
            // Refresh the entire page to re-initialize contexts with the new ID
            window.location.reload();
        } catch (err: any) {
            setError(err.message || 'Failed to save configuration.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[var(--theme-color)] opacity-5 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[var(--theme-color)] opacity-5 blur-[120px] rounded-full" />

            <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[var(--theme-color)] bg-opacity-10 border border-[var(--theme-color)] border-opacity-20 mb-6 group transition-all hover:scale-110">
                        <Rocket className="w-10 h-10 text-[var(--theme-color)]" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-3 uppercase">
                        Initialize <span className="text-[var(--theme-color)]">Resvi</span>
                    </h1>
                    <p className="text-gray-400 text-lg max-w-md mx-auto">
                        Welcome to your premium management suite. Enter your restaurant credentials to begin.
                    </p>
                </div>

                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-[var(--theme-color)] to-[#fcf3e3] rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative bg-gray-900 border border-gray-800 rounded-3xl p-8 md:p-10 shadow-2xl">
                        <form onSubmit={handleSave} className="space-y-8">
                            <div>
                                <label className="block text-xs font-bold text-[#c9a96e] uppercase tracking-widest mb-4">
                                    Restaurant Identity Token
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <ShieldCheck className="h-5 w-5 text-[#c9a96e] opacity-50" />
                                    </div>
                                    <input
                                        type="text"
                                        value={id}
                                        onChange={(e) => setId(e.target.value)}
                                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                        className="w-full bg-black/50 border border-gray-700 text-white placeholder:text-gray-600 pl-12 pr-4 py-4 rounded-xl focus:ring-2 focus:ring-[#c9a96e] focus:border-transparent transition-all text-lg font-mono"
                                        required
                                    />
                                </div>
                                {error && (
                                    <p className="mt-4 text-red-500 text-sm font-medium flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                        {error}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#c9a96e] hover:bg-[#b8955d] text-black font-black py-5 rounded-xl uppercase tracking-widest transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(201,169,110,0.3)] flex items-center justify-center gap-3 text-lg"
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Complete Setup
                                        <Check className="w-6 h-6" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-10 pt-10 border-t border-gray-800 grid grid-cols-2 gap-6">
                            <div className="flex items-start gap-3">
                                <div className="mt-1 p-1 rounded bg-gray-800/50">
                                    <Globe className="w-4 h-4 text-[#c9a96e]" />
                                </div>
                                <div>
                                    <div className="text-white text-sm font-bold">Cloud Sync</div>
                                    <div className="text-xs text-gray-400">Global connectivity enabled</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 p-1 rounded bg-gray-800/50">
                                    <Layout className="w-4 h-4 text-[#c9a96e]" />
                                </div>
                                <div>
                                    <div className="text-white text-sm font-bold">Custom UI</div>
                                    <div className="text-xs text-gray-400">Adaptive branding engine</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="text-center mt-10 text-gray-600 text-xs font-medium uppercase tracking-widest">
                    Resvi Premium v2.10 • Secure Installation Mode
                </p>
            </div>
        </div>
    );
};

export default StartupSetup;
