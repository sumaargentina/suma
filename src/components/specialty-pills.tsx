"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface SpecialtyPillsProps {
    specialties: { name: string; count: number }[];
}

export function SpecialtyPills({ specialties }: SpecialtyPillsProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentSpecialty = searchParams.get("specialty");

    // Ordenar por cantidad de médicos
    const sortedSpecialties = [...specialties].sort((a, b) => b.count - a.count);

    if (sortedSpecialties.length === 0) return null;

    const handleClick = (specialty: string) => {
        const params = new URLSearchParams(searchParams.toString());

        if (currentSpecialty === specialty) {
            params.delete("specialty");
        } else {
            params.set("specialty", specialty);
        }

        router.push(`/find-a-doctor?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-2 pb-1">
                {sortedSpecialties.map((spec) => {
                    const isActive = currentSpecialty === spec.name;

                    return (
                        <button
                            key={spec.name}
                            onClick={() => handleClick(spec.name)}
                            className={cn(
                                "shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                                isActive
                                    ? "bg-primary text-white"
                                    : "bg-white border border-slate-200 text-slate-600 hover:border-primary hover:text-primary"
                            )}
                        >
                            {spec.name}
                            <span className={cn(
                                "text-[10px]",
                                isActive ? "text-white/70" : "text-slate-400"
                            )}>
                                ({spec.count})
                            </span>
                        </button>
                    );
                })}
            </div>
            <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
        </div>
    );
}
