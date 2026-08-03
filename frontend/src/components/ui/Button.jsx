
export default function Button({ children, type, ...rest }) {
    return (
        <button
            type={type}
            className={`btn-${variant} ${rest.className}`}
            {...rest}
        >
            {children}
        </button>
    )
}
  