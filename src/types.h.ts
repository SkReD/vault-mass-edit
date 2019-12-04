export type Operation = {
    type: 'writeSecret' | 'none',
    data: {
        pattern: string,
        secrets?: string,
        options?: {
            dryRun: boolean
        }
    },
}
