// Stub implementations of React Router hooks for standalone build
export function useLocation() {
    return {
        pathname: '/',
        search: '',
        hash: window.location.hash,
        state: null,
        key: 'default'
    };
}

export function useNavigate() {
    return (to: string) => {
        if (typeof to === 'string' && to.startsWith('#')) {
            window.location.hash = to;
        } else {
            window.location.hash = '#' + to;
        }
    };
}

export function useParams() {
    return {};
}

export function useSearchParams() {
    return [new URLSearchParams(), () => { }];
}

// Stub components
export const Link = ({ to, children, ...props }: any) => {
    const href = typeof to === 'string' && to.startsWith('#') ? to : '#' + to;
    return <a href={href} {...props}>{children}</a>;
};

export const NavLink = Link;

export const Outlet = () => null;

// Stub types
export type LinksFunction = () => any[];

// Re-export everything as default
export default {
    useLocation,
    useNavigate,
    useParams,
    useSearchParams,
    Link,
    NavLink,
    Outlet
}; 