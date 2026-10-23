/*
 * YOUR CODE (on-chain). Turns what the contract returns into plain objects for the pages.
 * Every field has a safe empty value, so a missing answer never breaks the page. Fields are read by name.
 */

const big = (value) => BigInt(value ?? 0);
const num = (value) => Number(value ?? 0);
const ZERO = "0x0000000000000000000000000000000000000000";
const listOf = (value) => (value && typeof value !== "string" && typeof value[Symbol.iterator] === "function" ? Array.from(value) : []);

/** getHomeView(viewer, refId) */
const toHomeView = (v) => ({
    token: v?.token ?? ZERO,
    tokenSymbol: String(v?.tokenSymbol ?? ""),
    tokenDecimals: num(v?.tokenDecimals),
    entryCost: big(v?.entryCost),
    referralBps: num(v?.referralBps),
    rankCount: num(v?.rankCount),
    memberCount: num(v?.memberCount),
    queued: num(v?.queued),
    totalJoined: big(v?.totalJoined),
    totalReferral: big(v?.totalReferral),
    totalBoardPaid: big(v?.totalBoardPaid),
    totalFee: big(v?.totalFee),
    totalHeld: big(v?.totalHeld),
    refId: num(v?.refId),
    refValid: Boolean(v?.refValid),
    refAccount: v?.refAccount ?? ZERO,
    isMember: Boolean(v?.isMember),
    myId: num(v?.myId),
    mySponsor: num(v?.mySponsor),
    myDirects: num(v?.myDirects),
    myPositions: num(v?.myPositions),
    myCycles: num(v?.myCycles),
    myReferralEarned: big(v?.myReferralEarned),
    myBoardEarned: big(v?.myBoardEarned),
    myJoinedAt: num(v?.myJoinedAt),
    walletBalance: big(v?.walletBalance),
    allowance: big(v?.allowance),
    myRankCounts: listOf(v?.myRankCounts).map(num),
    tiers: listOf(v?.tiers).map(String),
    myLatestIndex: listOf(v?.myLatestIndex).map(num),
    myLatestFilled: listOf(v?.myLatestFilled).map(num),
    myBalances: listOf(v?.myBalances).map(big),
    upgradeCosts: listOf(v?.upgradeCosts).map(big),
    totalTopUp: big(v?.totalTopUp),
});

/** One RankInfo of getPlanView */
const toRank = (r) => ({
    rank: num(r?.rank),
    tier: String(r?.tier ?? ""),
    cost: big(r?.cost),
    inflow: big(r?.inflow),
    firstPayout: big(r?.firstPayout),
    payoutBps: num(r?.payoutBps),
    next: num(r?.next),
    fee: big(r?.fee),
    upgradeCost: big(r?.upgradeCost),
    rebirths: listOf(r?.rebirthRanks).map((rank, i) => ({ rank: num(rank), count: num(listOf(r?.rebirthCounts)[i]) })),
    positions: num(r?.positions),
    completed: num(r?.completed),
});

/** getPlanView() */
const toPlanView = (v) => ({
    tokenSymbol: String(v?.tokenSymbol ?? ""),
    tokenDecimals: num(v?.tokenDecimals),
    referralBps: num(v?.referralBps),
    memberCount: num(v?.memberCount),
    ranks: listOf(v?.ranks).map(toRank),
});

/** getBoardView(viewer, rank, index, offset, limit); `parent` is null at the top of a rank */
const toBoardView = (v) => {
    const parent = big(v?.parent);
    return {
        tokenSymbol: String(v?.tokenSymbol ?? ""),
        tokenDecimals: num(v?.tokenDecimals),
        rankCount: num(v?.rankCount),
        rank: num(v?.rank),
        tier: String(v?.tier ?? ""),
        cost: big(v?.cost),
        inflow: big(v?.inflow),
        firstPayout: big(v?.firstPayout),
        next: num(v?.next),
        positionCount: num(v?.positionCount),
        focus: num(v?.focus),
        parent: parent === (1n << 256n) - 1n ? null : Number(parent),
        nodes: listOf(v?.nodes).map((n) => ({
            exists: Boolean(n?.exists),
            index: num(n?.index),
            member: num(n?.member),
            account: n?.account ?? ZERO,
            filled: num(n?.filled),
            createdAt: num(n?.createdAt),
            from: num(n?.from),
        })),
        viewerId: num(v?.viewerId),
        myTotal: num(v?.myTotal),
        myIndices: listOf(v?.myIndices).map(num),
        myFrom: listOf(v?.myFrom).map(num),
        myRankCounts: listOf(v?.myRankCounts).map(num),
        tiers: listOf(v?.tiers).map(String),
    };
};

/** getTeamView(viewer, offset, limit) */
const toTeamView = (v) => ({
    myId: num(v?.myId),
    sponsorId: num(v?.sponsorId),
    sponsorAccount: v?.sponsorAccount ?? ZERO,
    directsTotal: num(v?.directsTotal),
    directs: listOf(v?.directs).map((d) => ({
        id: num(d?.id),
        account: d?.account ?? ZERO,
        joinedAt: num(d?.joinedAt),
        directs: num(d?.directs),
        positions: num(d?.positions),
    })),
});

export { toHomeView, toPlanView, toBoardView, toTeamView };
