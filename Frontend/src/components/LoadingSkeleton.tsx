// LoadingSkeleton - Reusable skeleton loaders for tables and cards
import { FC } from 'react';

interface SkeletonProps {
    rows?: number;
    columns?: number;
}

// Table Skeleton
export const TableSkeleton: FC<SkeletonProps> = ({ rows = 5, columns = 5 }) => {
    return (
        <div className="table-container">
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex gap-6">
                {Array.from({ length: columns }).map((_, i) => (
                    <div key={i} className="h-4 skeleton-shimmer rounded flex-1" style={{ maxWidth: i === 0 ? '120px' : '100px' }}></div>
                ))}
            </div>
            {/* Rows */}
            <div className="divide-y divide-slate-50">
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <div key={rowIndex} className="px-6 py-4 flex items-center gap-6" style={{ animationDelay: `${rowIndex * 0.05}s` }}>
                        {Array.from({ length: columns }).map((_, colIndex) => (
                            <div
                                key={colIndex}
                                className="skeleton-shimmer rounded"
                                style={{
                                    height: colIndex === 0 ? '20px' : '16px',
                                    width: colIndex === 0 ? '100px' : colIndex === columns - 1 ? '80px' : '120px',
                                    flex: colIndex === 1 ? 1 : 'none'
                                }}
                            ></div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

// Card Grid Skeleton
export const CardGridSkeleton: FC<{ count?: number }> = ({ count = 4 }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="card animate-pulse">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-14 h-14 rounded-2xl skeleton-shimmer"></div>
                        <div className="w-20 h-6 rounded-full skeleton-shimmer"></div>
                    </div>
                    <div className="space-y-2">
                        <div className="h-4 w-24 skeleton-shimmer rounded"></div>
                        <div className="h-8 w-16 skeleton-shimmer rounded"></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

// Skeleton de Tarjeta de Detalle
export const DetailSkeleton: FC = () => {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl skeleton-shimmer"></div>
                <div className="space-y-2">
                    <div className="h-6 w-48 skeleton-shimmer rounded"></div>
                    <div className="h-4 w-32 skeleton-shimmer rounded"></div>
                </div>
            </div>
            {/* Content Grid */}
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                    <div className="h-4 w-20 skeleton-shimmer rounded"></div>
                    <div className="h-5 w-32 skeleton-shimmer rounded"></div>
                    <div className="h-5 w-28 skeleton-shimmer rounded"></div>
                    <div className="h-5 w-36 skeleton-shimmer rounded"></div>
                </div>
                <div className="space-y-3">
                    <div className="h-4 w-20 skeleton-shimmer rounded"></div>
                    <div className="h-5 w-32 skeleton-shimmer rounded"></div>
                    <div className="h-5 w-28 skeleton-shimmer rounded"></div>
                    <div className="h-5 w-36 skeleton-shimmer rounded"></div>
                </div>
            </div>
        </div>
    );
};

// Form Skeleton
export const FormSkeleton: FC<{ fields?: number }> = ({ fields = 6 }) => {
    return (
        <div className="grid grid-cols-2 gap-4 animate-pulse">
            {Array.from({ length: fields }).map((_, i) => (
                <div key={i} className={i === fields - 1 ? 'col-span-2' : ''}>
                    <div className="h-4 w-20 skeleton-shimmer rounded mb-2"></div>
                    <div className="h-12 skeleton-shimmer rounded-xl"></div>
                </div>
            ))}
        </div>
    );
};

// Skeleton de Línea Individual
export const LineSkeleton: FC<{ width?: string }> = ({ width = '100%' }) => {
    return <div className="h-4 skeleton-shimmer rounded" style={{ width }}></div>;
};

// Avatar Skeleton
export const AvatarSkeleton: FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
    const sizes = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-14 h-14' };
    return <div className={`${sizes[size]} rounded-full skeleton-shimmer`}></div>;
};

export default TableSkeleton;
