import { ElementType } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

interface CardStatProps {
    title: string;
    value: string | number;
    subValue?: string;
    icon: ElementType;
    color: 'blue' | 'emerald' | 'violet' | 'amber' | 'rose' | 'indigo' | 'cyan';
    trend?: string;
    trendUp?: boolean;
    data?: number[]; // Array of numbers for sparkline
    onClick?: () => void;
    delay?: number;
}

const colorMap = {
    blue: {
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        gradient: 'from-blue-500 to-blue-600',
        chart: '#3b82f6'
    },
    emerald: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-600',
        gradient: 'from-emerald-500 to-teal-600',
        chart: '#10b981'
    },
    violet: {
        bg: 'bg-violet-50',
        text: 'text-violet-600',
        gradient: 'from-violet-500 to-purple-600',
        chart: '#8b5cf6'
    },
    amber: {
        bg: 'bg-amber-50',
        text: 'text-amber-600',
        gradient: 'from-amber-500 to-orange-600',
        chart: '#f59e0b'
    },
    rose: {
        bg: 'bg-rose-50',
        text: 'text-rose-600',
        gradient: 'from-rose-500 to-pink-600',
        chart: '#f43f5e'
    },
    indigo: {
        bg: 'bg-indigo-50',
        text: 'text-indigo-600',
        gradient: 'from-indigo-500 to-indigo-600',
        chart: '#6366f1'
    },
    cyan: {
        bg: 'bg-cyan-50',
        text: 'text-cyan-600',
        gradient: 'from-cyan-500 to-cyan-600',
        chart: '#06b6d4'
    }
};

const CardStat = ({ title, value, subValue, icon: Icon, color, trend, trendUp = true, data = [], onClick, delay = 0 }: CardStatProps) => {
    const colors = colorMap[color];
    const chartData = data.map((val, i) => ({ i, val }));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: delay * 0.1 }}
            onClick={onClick}
            className="group relative bg-white rounded-2xl p-6 border border-slate-100 shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer overflow-hidden hover:-translate-y-1"
        >
            {/* Background Decoration */}
            <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-[0.03] transition-transform duration-500 group-hover:scale-150 ${colors.bg.replace('bg-', 'bg-current text-')}`} />

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={clsx(
                    "p-3 rounded-2xl shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                    `bg-gradient-to-br ${colors.gradient} text-white`
                )}>
                    <Icon className="w-6 h-6" />
                </div>

                {trend && (
                    <div className={clsx(
                        "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                        colors.bg,
                        colors.text
                    )}>
                        {trend}
                    </div>
                )}
            </div>

            <div className="relative z-10">
                <h3 className="text-slate-500 text-sm font-semibold mb-1">{title}</h3>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-800 tracking-tight">{value}</span>
                    {subValue && <span className="text-xs text-slate-400 font-medium">{subValue}</span>}
                </div>
            </div>

            {/* Micro Sparkline Chart */}
            {chartData.length > 0 && (
                <div className="h-12 w-full mt-4 -mb-2 opacity-50 group-hover:opacity-100 transition-opacity duration-300">
                    <ResponsiveContainer width="100%" height={48}>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colors.chart} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={colors.chart} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="val"
                                stroke={colors.chart}
                                strokeWidth={2}
                                fillOpacity={1}
                                fill={`url(#gradient-${color})`}
                                isAnimationActive={true}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-200 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none" />
        </motion.div>
    );
};

export default CardStat;
