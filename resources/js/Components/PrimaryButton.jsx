export default function PrimaryButton({
                                          className = '',
                                          disabled,
                                          children,
                                          ...props
                                      }) {
    return (
        <button
            {...props}
            className={
                `items-center rounded-md border border-transparent bg-primary px-4 py-2 text-xs font-semibold tracking-widest text-white transition duration-150 ease-in-out hover:bg-primary focus:bg-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:bg-primary ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
