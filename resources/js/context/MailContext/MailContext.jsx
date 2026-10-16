import { createContext, useEffect, useState } from "react";
import axios from "axios";
import api from "@/lib/axios.js";
import { toast } from "sonner";
import { usePage } from "@inertiajs/react";

export const MailContext = createContext(null);

export function MailProvider({ children }) {
    const { auth } = usePage().props;
    const [mailCards, setMailCards] = useState([]);
    const [selectedMail, setSelectedMail] = useState("");
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeScopeFilter, setActiveScopeFilter] = useState(null);
    const [sideFilter, setSideFilter] = useState("received"); // 'received' or 'sent'

    const { props } = usePage();
    const user = props?.auth?.user;

    const loadMailCards = async () => {
        try {
            setLoading(true);
            const res = await api.get("/api/pqrs");
            setMailCards(res.data.data);
        } catch (err) {
            toast.error(
                err?.response?.data?.message ||
                err.message ||
                "Error al hacer la peticion"
            );
            throw new Error("Error al hacer la peticion");
        } finally {
            setLoading(false);
        }
    };

    const toggleFilter = (type) => {
        setFilters((prev) =>
            prev.includes(type)
                ? prev.filter((t) => t !== type)
                : [...prev, type]
        );
    };

    const filteredMailCards = mailCards.filter((card) => {
        const matchesFilter =
            filters.length === 0 || filters.includes(card.request_type);
        const matchesSearch =
            searchTerm === "" ||
            card.affair?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            card.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            card.id?.toString().includes(searchTerm) ||
            card.sender_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            card.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            card.document?.toString().includes(searchTerm) ||
            (card.sheet_number?.number?.toString().includes(searchTerm) || 
             card.sheetNumber?.number?.toString().includes(searchTerm));

        let matchesScope = true;
        if (activeScopeFilter) {
            if (activeScopeFilter.type === 'sheet') {
                matchesScope = card.sheet_number_id === activeScopeFilter.id;
            } else if (activeScopeFilter.type === 'dependency') {
                matchesScope = card.dependency_id === activeScopeFilter.id;
            }
        }
        //con este filtro se muestra los pqr respondidos o no respondidos
        const isResponded = card.response_status === 'responded' || card.response_status === 'closed';
        const matchesSide = sideFilter === 'sent' ? isResponded : !isResponded;

        return matchesSide && matchesFilter && matchesSearch && matchesScope;
    });

    useEffect(() => {
        if (auth?.user?.id) {
            loadMailCards();
        }
    }, [auth?.user?.id]);

    useEffect(() => {
        setSelectedMail("");
    }, [sideFilter]);

    return (
        <MailContext.Provider
            value={{
                mailCards,
                filteredMailCards,
                setMailCards,
                selectedMail,
                setSelectedMail,
                loading,
                filters,
                toggleFilter,
                searchTerm,
                setSearchTerm,
                activeScopeFilter,
                setActiveScopeFilter,
                sideFilter,
                setSideFilter,
                reloadMailCards: loadMailCards,
            }}
        >
            {children}
        </MailContext.Provider>
    );
}
