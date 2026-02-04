"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { COUNTRY_CODES } from "@/lib/types";

interface CountryCodeSelectProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

export function CountryCodeSelect({ value, onChange, className }: CountryCodeSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");

    // Find the current country from the value
    const selectedCountry = COUNTRY_CODES.find((c) => c.code === value);

    // Filter countries based on search query
    const filteredCountries = React.useMemo(() => {
        if (!searchQuery) return COUNTRY_CODES;
        const query = searchQuery.toLowerCase();
        return COUNTRY_CODES.filter(
            (country) =>
                country.country.toLowerCase().includes(query) ||
                country.code.includes(query)
        );
    }, [searchQuery]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("justify-between", className)}
                >
                    {selectedCountry ? (
                        <span className="flex items-center gap-1.5">
                            <span>{selectedCountry.flag}</span>
                            <span className="font-mono text-sm">{selectedCountry.code}</span>
                        </span>
                    ) : (
                        <span className="text-muted-foreground">Código...</span>
                    )}
                    <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Buscar país..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                    />
                    <CommandList>
                        <CommandEmpty>No encontrado.</CommandEmpty>
                        <CommandGroup className="max-h-[250px] overflow-y-auto">
                            {filteredCountries.map((country) => (
                                <CommandItem
                                    key={country.code}
                                    value={country.code}
                                    onSelect={() => {
                                        onChange(country.code);
                                        setOpen(false);
                                        setSearchQuery("");
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <Check
                                        className={cn(
                                            "h-4 w-4",
                                            value === country.code ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <span>{country.flag}</span>
                                    <span className="flex-1 truncate text-sm">{country.country}</span>
                                    <span className="font-mono text-xs text-muted-foreground">{country.code}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
