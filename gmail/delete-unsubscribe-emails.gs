function cleanupGmailUnsubscribe() {
  const batchSize = 100;
  let startIndex = 0;
  let totalProcessed = 0;
  const cache = CacheService.getScriptCache();
  const startTime = new Date().getTime();
  const maxExecutionTime = 5.5 * 60 * 1000; // 5.5 minutes in milliseconds

  while (new Date().getTime() - startTime < maxExecutionTime) {
    const threads = GmailApp.getInboxThreads(startIndex, batchSize);
    if (threads.length === 0) break;

    const threadsToTrash = [];
    threads.forEach(thread => {
      const firstMessage = thread.getMessages()[0];
      if (hasUnsubscribeHeader(firstMessage, cache)) {
        threadsToTrash.push(thread);
        totalProcessed++;
      }
    });

    if (threadsToTrash.length > 0) {
      GmailApp.moveThreadsToTrash(threadsToTrash);
    }

    startIndex += batchSize;
    if (threads.length < batchSize) break;
  }

  Logger.log('Total emails with unsubscribe headers moved to trash: ' + totalProcessed);
}

function hasUnsubscribeHeader(message, cache) {
  const messageId = message.getId();
  const cacheKey = 'unsub_' + messageId;
  
  let cachedResult = cache.get(cacheKey);
  if (cachedResult !== null) {
    return cachedResult === 'true';
  }

  const headers = message.getRawContent().split('\r\n');
  const hasUnsubscribe = headers.some(header => 
    /unsubscribe|opt[-_]?out|remove[-_]?me|preferences|manage[-_]?subscriptions/i.test(header)
  );

  cache.put(cacheKey, hasUnsubscribe.toString(), 21600); // Cache for 6 hours
  return hasUnsubscribe;
}