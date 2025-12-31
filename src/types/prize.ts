export type PrizeRuleType = 'equal_share' | 'rank_kill' | 'fixed_list';

export interface BasePrizeRule {
    id: string; // UUID
    name: string;
    type: PrizeRuleType;
    created_at?: string;
}

export interface EqualShareRule extends BasePrizeRule {
    type: 'equal_share';
    config: {
        total_prize: number;
    };
}

export interface RankKillRule extends BasePrizeRule {
    type: 'rank_kill';
    config: {
        per_kill: number;
        rank_rewards: Record<string, number>; // "1": 500, "2": 300
    };
}

export interface FixedListRule extends BasePrizeRule {
    type: 'fixed_list';
    config: {
        prizes: number[]; // Index based: [Rank 1, Rank 2, ...]
    };
}

export type PrizeRule = EqualShareRule | RankKillRule | FixedListRule;

export interface MatchResultInput {
    uid: string;
    username: string;
    kills: number;
    rank: number;
    teamId?: string; // Optional team grouping
}

export interface CalculatedWinner {
    uid: string;
    amount: number;
    breakdown: string;
    position?: number;
}
