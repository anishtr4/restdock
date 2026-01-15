import { useState, useEffect, useCallback } from 'react';
import { Environment } from '@/types';
import { dbService } from '@/services/db';

export const useEnvironments = () => {
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [activeEnvironment, setActiveEnvironment] = useState<Environment | null>(null);
    const [loading, setLoading] = useState(true);

    const loadEnvironments = useCallback(async () => {
        setLoading(true);
        try {
            const envs = await dbService.getEnvironments();
            setEnvironments(envs);
            const active = envs.find((e: Environment) => e.is_active) || null;
            setActiveEnvironment(active);
        } catch (error) {
            console.error("Failed to load environments:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEnvironments();

        const handleEnvChange = () => {
            loadEnvironments();
        };

        window.addEventListener('REST_DOCK_ENV_CHANGE', handleEnvChange);
        return () => {
            window.removeEventListener('REST_DOCK_ENV_CHANGE', handleEnvChange);
        };
    }, [loadEnvironments]);

    const notifyChange = () => {
        window.dispatchEvent(new Event('REST_DOCK_ENV_CHANGE'));
    };

    const addEnvironment = async (name: string) => {
        const newEnv: Environment = {
            id: crypto.randomUUID(),
            name,
            variables: [],
            is_active: false
        };
        await dbService.saveEnvironment(newEnv);
        notifyChange();
        return newEnv;
    };

    const updateEnvironment = async (env: Environment) => {
        await dbService.saveEnvironment(env);
        if (activeEnvironment?.id === env.id) {
            setActiveEnvironment(env);
        }
        notifyChange();
    };

    const deleteEnvironment = async (id: string) => {
        await dbService.deleteEnvironment(id);
        if (activeEnvironment?.id === id) {
            setActiveEnvironment(null);
        }
        notifyChange();
    };

    const activateEnvironment = async (id: string | null) => {
        await dbService.setActiveEnvironment(id);
        notifyChange();
    };

    return {
        environments,
        activeEnvironment,
        loading,
        addEnvironment,
        updateEnvironment,
        deleteEnvironment,
        activateEnvironment,
        refreshEnvironments: notifyChange
    };
};
