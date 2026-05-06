declare module 'google-trends-api' {
  interface TrendsOptions {
    keyword: string | string[]
    startTime?: Date
    endTime?: Date
    geo?: string
    hl?: string
  }

  function interestOverTime(options: TrendsOptions): Promise<string>
  function relatedTopics(options: TrendsOptions): Promise<string>
  function relatedQueries(options: TrendsOptions): Promise<string>
  function dailyTrends(options: { trendDate?: Date; geo?: string; hl?: string }): Promise<string>
  function realTimeTrends(options: { category?: string; geo?: string; hl?: string }): Promise<string>

  export { interestOverTime, relatedTopics, relatedQueries, dailyTrends, realTimeTrends }
}
