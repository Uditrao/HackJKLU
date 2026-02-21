"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        age: "",
        area: ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const nextStep = () => {
        if (step < 2) setStep(step + 1);
    };

    const prevStep = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch("/web/api/user-details", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                router.push("/web/dashboard");
            } else {
                console.error("Failed to save user details");
                alert("Something went wrong. Please try again.");
            }
        } catch (error) {
            console.error("Error submitting form:", error);
            alert("An error occurred. Please check your connection.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#faf8f3] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#d4972a]/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#1a1a2e]/5 rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl border border-[#e8e0d0] p-10 md:p-14 relative z-10"
            >
                {/* Header */}
                <div className="text-center space-y-4 mb-12">
                    <h1 className="text-4xl font-bold text-[#1a1a2e] tracking-tight">Welcome home</h1>
                    <p className="text-[#6b6b7b]">Let&apos;s personalize your learning experience.</p>
                </div>

                {/* Progress Bar */}
                <div className="flex gap-2 mb-12">
                    {[1, 2].map(i => (
                        <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= i ? "bg-[#d4972a]" : "bg-[#e8e0d0]"}`}
                        />
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-[#1a1a2e] ml-1">What should we call you?</label>
                                    <input
                                        required
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Your full name"
                                        className="w-full bg-[#faf8f3] border border-[#e8e0d0] rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#d4972a] focus:border-transparent transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-[#1a1a2e] ml-1">How old are you?</label>
                                    <input
                                        required
                                        type="number"
                                        name="age"
                                        value={formData.age}
                                        onChange={handleChange}
                                        placeholder="Enter your age"
                                        className="w-full bg-[#faf8f3] border border-[#e8e0d0] rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#d4972a] focus:border-transparent transition-all"
                                    />
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-[#1a1a2e] ml-1">Where do you live? (Area)</label>
                                    <input
                                        required
                                        type="text"
                                        name="area"
                                        value={formData.area}
                                        onChange={handleChange}
                                        placeholder="City / Region"
                                        className="w-full bg-[#faf8f3] border border-[#e8e0d0] rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#d4972a] focus:border-transparent transition-all"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Navigation Buttons */}
                    <div className="flex gap-4 pt-4">
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={prevStep}
                                className="flex-1 border border-[#e8e0d0] text-[#1a1a2e] font-semibold py-4 rounded-2xl hover:bg-[#faf8f3] transition-all"
                            >
                                Back
                            </button>
                        )}
                        {step === 1 ? (
                            <button
                                type="button"
                                onClick={nextStep}
                                disabled={!formData.name || !formData.age}
                                className={`flex-[2] py-4 rounded-2xl font-semibold transition-all ${(!formData.name || !formData.age) ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-[#1a1a2e] text-white hover:bg-[#2d2d44] shadow-lg shadow-[#1a1a2e]/20"}`}
                            >
                                Next Step
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={isSubmitting || !formData.area}
                                className={`flex-[2] py-4 rounded-2xl font-semibold transition-all ${isSubmitting || !formData.area ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-[#d4972a] text-[#1a1a2e] hover:bg-[#e8b84b] shadow-lg shadow-[#d4972a]/20"}`}
                            >
                                {isSubmitting ? "Saving..." : "Join Boli"}
                            </button>
                        )}
                    </div>
                </form>
            </motion.div>
        </main>
    );
}
