import { PrizeRule, MatchResultInput, CalculatedWinner } from '../types/prize';

/**
 * Calculate winnings for a match based on the selected rule and user results.
 */
export const calculateWinnings = (
    rule: PrizeRule,
    results: MatchResultInput[]
): CalculatedWinner[] => {
    const winners: CalculatedWinner[] = [];

    if (rule.type === 'equal_share') {
        // Distribute total prize equally among all winners (results passed in are considered winners)
        const totalPrize = rule.config.total_prize;
        const count = results.length;
        if (count === 0) return [];

        const amountEach = Math.floor(totalPrize / count); // Floor to avoid decimals issues

        results.forEach(res => {
            winners.push({
                uid: res.uid,
                amount: amountEach,
                breakdown: `Equal Share: ${totalPrize} / ${count} players`,
                position: res.rank
            });
        });

    } else if (rule.type === 'rank_kill') {
        const { per_kill, rank_rewards } = rule.config;

        results.forEach(res => {
            let total = 0;
            const parts: string[] = [];

            // Rank Reward
            const rankKey = res.rank.toString();
            if (rank_rewards[rankKey]) {
                const rankAmount = rank_rewards[rankKey];
                total += rankAmount;
                parts.push(`Rank ${res.rank} (${rankAmount})`);
            }

            // Kill Reward
            if (res.kills > 0) {
                const killAmount = res.kills * per_kill;
                total += killAmount;
                parts.push(`${res.kills} Kills (${killAmount})`);
            }

            if (total > 0) {
                winners.push({
                    uid: res.uid,
                    amount: total,
                    breakdown: parts.join(' + '),
                    position: res.rank
                });
            }
        });

    } else if (rule.type === 'fixed_list') {
        // Simple list: Rank 1 gets prizes[0], Rank 2 gets prizes[1]
        const { prizes } = rule.config;

        results.forEach(res => {
            const index = res.rank - 1; // 1-based rank to 0-based index
            if (index >= 0 && index < prizes.length) {
                const amount = prizes[index];
                if (amount > 0) {
                    winners.push({
                        uid: res.uid,
                        amount,
                        breakdown: `Rank ${res.rank} Fixed Prize`,
                        position: res.rank
                    });
                }
            }
        });
    }

    return winners;
};
