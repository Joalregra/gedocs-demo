import Header from '@/Components/Header/Header'
import Sidebar from '@/Components/Sidebar/Sidebar'
import React from 'react'
import DropdownFolders from "@/Components/ArchiveExplorer/DropdownFolders.jsx";

export const DashboardLayout = ({children}) => {
    return (
        <div className='bg-gray-100'>
            <Header/>
            <div className='flex gap-[5px] h-screen'>
                <Sidebar/>
                <div className='pt-14 pb-2 flex-1 min-w-0 h-full'>
                    {children}
                </div>
            </div>

        </div>
    )
}
