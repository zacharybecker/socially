"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./use-auth";
import { Organization } from "@/types";
import { api, endpoints } from "../api";

interface OrganizationContextType {
  organizations: Organization[];
  currentOrganization: Organization | null;
  loading: boolean;
  error: string | null;
  setCurrentOrganization: (org: Organization | null) => void;
  createOrganization: (name: string) => Promise<Organization>;
  updateOrganization: (id: string, name: string) => Promise<Organization>;
  deleteOrganization: (id: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const CURRENT_ORG_KEY = "social-media-manager-current-org";

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganizationState] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizations = async () => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrganizationState(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.get<{ success: boolean; data: Organization[] }>(endpoints.organizations.list);
      const orgs = response.data || [];
      setOrganizations(orgs);

      // Restore last selected organization or select first one
      const savedOrgId = localStorage.getItem(CURRENT_ORG_KEY);
      const savedOrg = savedOrgId ? orgs.find((o) => o.id === savedOrgId) : null;
      setCurrentOrganizationState(savedOrg || orgs[0] || null);
    } catch (err) {
      console.error("Failed to fetch organizations:", err);
      setError("Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [user]);

  const setCurrentOrganization = (org: Organization | null) => {
    setCurrentOrganizationState(org);
    if (org) {
      localStorage.setItem(CURRENT_ORG_KEY, org.id);
    } else {
      localStorage.removeItem(CURRENT_ORG_KEY);
    }
  };

  const createOrganization = async (name: string): Promise<Organization> => {
    const response = await api.post<{ success: boolean; data: Organization }>(endpoints.organizations.create, { name });
    const org = response.data;
    setOrganizations((prev) => [...prev, org]);
    if (!currentOrganization) {
      setCurrentOrganization(org);
    }
    return org;
  };

  const updateOrganization = async (id: string, name: string): Promise<Organization> => {
    const response = await api.put<{ success: boolean; data: Organization }>(endpoints.organizations.update(id), { name });
    const org = response.data;
    setOrganizations((prev) => prev.map((o) => (o.id === id ? org : o)));
    if (currentOrganization?.id === id) {
      setCurrentOrganizationState(org);
    }
    return org;
  };

  const deleteOrganization = async (id: string): Promise<void> => {
    await api.delete(endpoints.organizations.delete(id));
    setOrganizations((prev) => prev.filter((o) => o.id !== id));
    if (currentOrganization?.id === id) {
      const remaining = organizations.filter((o) => o.id !== id);
      setCurrentOrganization(remaining[0] || null);
    }
  };

  const refreshOrganizations = async () => {
    await fetchOrganizations();
  };

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrganization,
        loading,
        error,
        setCurrentOrganization,
        createOrganization,
        updateOrganization,
        deleteOrganization,
        refreshOrganizations,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}
