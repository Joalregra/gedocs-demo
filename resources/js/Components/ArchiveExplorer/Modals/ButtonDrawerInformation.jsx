// ButtonDrawerInformation is a button component that opens the information drawer/modal to show details about the selected file or folder.
import { InformationCircleIcon } from '@heroicons/react/16/solid'
import React from 'react'

const ButtonDrawerInformation = () => {
    return (

        <button onClick={() => document.getElementById('drawer-information').showModal()} className='cursor-pointer'>
            <InformationCircleIcon className="size-6" />
        </button>
    )
}

export default ButtonDrawerInformation