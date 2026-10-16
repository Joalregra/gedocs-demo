import { ROLES } from "@/constants/roles";
import { usePage } from '@inertiajs/react';
import React, { useContext, useEffect, useMemo } from 'react';
import { Menu, MenuItem, MenuButton, SubMenu, MenuDivider } from '@szhsin/react-menu';
import { MailContext } from '@/context/MailContext/MailContext.jsx';


const SelectDependecyOrNumberSheet = ({
    activeScopeFilter = null,
    setActiveScopeFilter = null,
    showOnRoutes = ['inbox', 'archive', 'outbox'],
}) => {
    const { sheets = [], auth } = usePage().props;
    const mailContext = useContext(MailContext);
    const user = auth?.user;
    const role = user?.roles?.[0]?.name;
    const isArchiveRoute = route().current() === 'archive';

    const currentScopeFilter = activeScopeFilter ?? mailContext?.activeScopeFilter ?? null;
    const setScopeFilter = setActiveScopeFilter ?? mailContext?.setActiveScopeFilter ?? null;

    const scopedSheets = useMemo(() => {
        if (role !== ROLES.AUXILIAR || !isArchiveRoute) return sheets;

        const dependencyId = user?.dependency_id;
        if (!dependencyId) return [];

        return sheets
            .map((sheet) => ({
                ...sheet,
                dependencies: (sheet.dependencies || []).filter((dep) => dep.id === dependencyId),
            }))
            .filter((sheet) => sheet.dependencies.length > 0);
    }, [role, sheets, user?.dependency_id, isArchiveRoute]);

    const availableDependencies = useMemo(() => {
        const deps = [];
        scopedSheets.forEach((sheet) => {
            (sheet.dependencies || []).forEach((dependency) => {
                deps.push({
                    ...dependency,
                    sheetNumber: sheet.number,
                });
            });
        });
        return deps;
    }, [scopedSheets]);

    useEffect(() => {
        if (role !== ROLES.AUXILIAR || !isArchiveRoute || !setScopeFilter) return;

        const assistantDependency = availableDependencies[0];
        if (!assistantDependency) {
            setScopeFilter(null);
            return;
        }

        const mustResetFilter =
            !currentScopeFilter ||
            currentScopeFilter.type !== 'dependency' ||
            currentScopeFilter.id !== assistantDependency.id;

        if (mustResetFilter) {
            setScopeFilter({
                type: 'dependency',
                id: assistantDependency.id,
                name: assistantDependency.name,
            });
        }
    }, [role, availableDependencies, setScopeFilter, currentScopeFilter, isArchiveRoute]);

    const showSheetSelection = role !== ROLES.AUXILIAR || !isArchiveRoute;

    const handleSelect = (type, id, name) => {
        if (setScopeFilter) {
            setScopeFilter({ type, id, name });
        }
    };

    const handleClear = (e) => {
        if (setScopeFilter) {
            e.stopPropagation();
            setScopeFilter(null);
        }
    };

    const getButtonText = () => {
        if (currentScopeFilter) {
            return `${currentScopeFilter.name}`;
        }
        return showSheetSelection ? "Entidad y/o dependencia" : "Dependencia";
    };

    if (!showOnRoutes.includes(route().current())) {
        return null;
    }

    if (role === ROLES.AUXILIAR) {
        return null;
    }

    if (!scopedSheets.length) {
        return null;
    }

    return (
        <Menu
            menuButton={
                <MenuButton className="cursor-pointer max-w-[150px] xs:max-w-[200px] sm:max-w-xs p-2 border border-gray-300 bg-white hover:bg-gray-50 transition-colors rounded-lg flex items-center justify-between gap-2 text-xs sm:text-sm font-medium shadow-sm">
                    <span className="truncate" title={getButtonText()}>{getButtonText()}</span>
                    {showSheetSelection && currentScopeFilter && (
                        <button
                            onClick={handleClear}
                            className="text-gray-400 hover:text-red-500 rounded-full bg-gray-100/80 hover:bg-red-50 p-0.5 ml-1 leading-none shrink-0 transition-colors"
                            title="Limpiar filtro"
                        >
                            &times;
                        </button>
                    )}
                </MenuButton>
            }
            transition
            position="right"
        >
            {showSheetSelection ? (
                scopedSheets.map((sheet) => (
                    sheet.dependencies?.length > 0 ? (
                        <SubMenu
                            key={sheet.id}
                            label={sheet.number}
                            className="p-0"
                            openTrigger="clickOnly"
                        >
                            <MenuItem onClick={() => handleSelect('sheet', sheet.id, `Entidad ${sheet.number}`)}>
                                <span className="font-bold">Todas (Entidad {sheet.number})</span>
                            </MenuItem>
                            <MenuDivider />
                            {sheet.dependencies.map((dependency) => (
                                <MenuItem
                                    key={dependency.id}
                                    onClick={() => handleSelect('dependency', dependency.id, dependency.name)}
                                >
                                    {dependency.name}
                                </MenuItem>
                            ))}
                        </SubMenu>
                    ) : (
                        <MenuItem
                            key={sheet.id}
                            onClick={() => handleSelect('sheet', sheet.id, `Entidad ${sheet.number}`)}
                        >
                            {sheet.number}
                        </MenuItem>
                    )
                ))
            ) : (
                availableDependencies.map((dependency) => (
                    <MenuItem
                        key={dependency.id}
                        onClick={() => handleSelect('dependency', dependency.id, dependency.name)}
                    >
                        {dependency.name}
                    </MenuItem>
                ))
            )}
        </Menu>
    )
}

export default SelectDependecyOrNumberSheet;
