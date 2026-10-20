import test from 'node:test';
import assert from 'node:assert/strict';

test('Frontend loading cleanup: finally block always resets loading flag on 503 error', async () => {
  let summarizingId = null;
  let summaryError = null;
  let failedDocId = null;

  // Mock API function that simulates backend 503 UNAVAILABLE
  const mockApiSummarizeDocument = async (_id) => {
    throw new Error('The Gemini AI service is temporarily experiencing high demand (model: gemini-3.8-flash). Please try again shortly.');
  };

  const handleSummarize = async (id) => {
    if (summarizingId !== null) return; // Prevent duplicate
    summarizingId = id;
    summaryError = null;
    failedDocId = null;

    try {
      await mockApiSummarizeDocument(id);
    } catch (err) {
      summaryError = err.message;
      failedDocId = id;
    } finally {
      // Guaranteed cleanup
      summarizingId = null;
    }
  };

  // Trigger summarize
  await handleSummarize(42);

  // Assertions:
  assert.equal(summarizingId, null, 'summarizingId must be reset to null after error');
  assert.equal(failedDocId, 42, 'failedDocId should be stored for manual retry');
  assert.match(summaryError, /temporarily experiencing high demand/, 'User-friendly error message should be set');
});

test('Frontend loading cleanup: prevents duplicate concurrent requests while one is in-flight', async () => {
  let summarizingId = null;
  let networkCallCount = 0;

  const mockSlowApi = async (_id) => {
    networkCallCount++;
    await new Promise((r) => setTimeout(r, 50));
    return { summary: 'Done' };
  };

  const handleSummarize = async (id) => {
    if (summarizingId !== null) {
      return false; // Rejected due to duplicate
    }
    summarizingId = id;
    try {
      await mockSlowApi(id);
      return true;
    } finally {
      summarizingId = null;
    }
  };

  // Fire first request
  const firstPromise = handleSummarize(10);
  // Fire duplicate request while first is running
  const secondPromise = handleSummarize(10);

  const [firstResult, secondResult] = await Promise.all([firstPromise, secondPromise]);

  assert.equal(firstResult, true, 'First request should execute');
  assert.equal(secondResult, false, 'Second duplicate request should be blocked');
  assert.equal(networkCallCount, 1, 'Only one network call should have occurred');
  assert.equal(summarizingId, null, 'Loading state must be cleared after execution');
});

test('Frontend loading cleanup: client timeout AbortController clears loading state cleanly', async () => {
  let isAsking = false;
  let queryError = null;

  const mockHangingApi = async (signal) => {
    return new Promise((_, reject) => {
      signal.addEventListener('abort', () => {
        reject(new Error('Request timed out after 45s. The server or AI service took too long to respond. Please try again.'));
      });
    });
  };

  const handleSubmit = async () => {
    if (isAsking) return;
    isAsking = true;
    queryError = null;

    const controller = new AbortController();
    // Simulate timeout trigger
    const timeoutId = setTimeout(() => controller.abort(), 20);

    try {
      await mockHangingApi(controller.signal);
    } catch (err) {
      queryError = err.message;
    } finally {
      clearTimeout(timeoutId);
      isAsking = false;
    }
  };

  await handleSubmit();

  assert.equal(isAsking, false, 'isAsking must reset to false on timeout');
  assert.match(queryError, /Request timed out/, 'Timeout error message captured');
});

test('Frontend loading cleanup: unmount abort cancellation clears pending state without error flash', async () => {
  let summarizingId = null;
  let summaryError = null;

  const controller = new AbortController();

  const handleSummarizeWithCancel = async (id) => {
    summarizingId = id;
    try {
      await new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error('Request was cancelled.'));
        });
      });
    } catch (err) {
      if (controller.signal.aborted) {
        // Component unmounted, avoid flashing error
        return;
      }
      summaryError = err.message;
    } finally {
      summarizingId = null;
    }
  };

  const promise = handleSummarizeWithCancel(99);
  // Simulate user navigating away / component unmount
  controller.abort();
  await promise;

  assert.equal(summarizingId, null, 'Loading state must be reset to null upon cancellation');
  assert.equal(summaryError, null, 'No error banner should flash on deliberate unmount/cancel');
});
