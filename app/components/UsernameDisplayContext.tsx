"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type UsernameDisplayContextValue = {
  username: string | null;
  setUsername: (u: string | null) => void;
};

const UsernameDisplayContext = createContext<UsernameDisplayContextValue | null>(
  null
);

export function UsernameDisplayProvider({
  initialUsername,
  children,
}: {
  initialUsername: string | null;
  children: ReactNode;
}) {
  const [username, setUsername] = useState<string | null>(initialUsername);
  useEffect(() => {
    setUsername(initialUsername);
  }, [initialUsername]);
  return (
    <UsernameDisplayContext.Provider value={{ username, setUsername }}>
      {children}
    </UsernameDisplayContext.Provider>
  );
}

export function useUsernameDisplay() {
  return useContext(UsernameDisplayContext);
}
