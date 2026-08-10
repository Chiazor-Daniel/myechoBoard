import { test, expect } from '@playwright/test';

async function closeOverlays(page) {
  // Mark tour and changelog as already seen so they stay closed.
  await page.evaluate(() => {
    try {
      localStorage.setItem('penecho-changelog-seen', '0.8.1');
      const tourKey = 'penecho-tour-progress';
      const raw = localStorage.getItem(tourKey);
      const progress = raw ? JSON.parse(raw) : { schema: 1, seen: [] };
      progress.seen = ['core-manual-ai-v1'];
      localStorage.setItem(tourKey, JSON.stringify(progress));
    } catch {}
    const tourLayer = document.querySelector('#tourLayer');
    if (tourLayer && tourLayer.getAttribute('aria-hidden') === 'false') {
      const skip = document.querySelector('#tourSkip');
      if (skip) skip.click();
    }
    const changelog = document.querySelector('#changelogLayer');
    if (changelog && changelog.getAttribute('aria-hidden') === 'false') {
      const done = document.querySelector('#changelogDone') || document.querySelector('#changelogClose');
      if (done) done.click();
    }
  });
  const changelog = page.locator('#changelogLayer');
  if (await changelog.isVisible().catch(() => false)) {
    await page.locator('#changelogDone, #changelogClose').first().click();
  }
  const settings = page.locator('#settingsLayer');
  if (await settings.isVisible().catch(() => false)) {
    await page.locator('#settingsClose').click();
  }
}

async function ensurePenMode(page) {
  const pen = page.locator('[data-mode="pen"]').first();
  await pen.click();
  await expect(pen).toHaveAttribute('aria-pressed', 'true');
}

async function drawEquation(page, centerX, centerY) {
  // Draw "2 + 2 = ?" as a sequence of strokes.
  const strokes = [
    // digit 2
    [
      [centerX - 80, centerY - 20],
      [centerX - 60, centerY - 30],
      [centerX - 50, centerY - 15],
      [centerX - 70, centerY + 10],
      [centerX - 55, centerY + 25],
    ],
    // plus sign
    [
      [centerX - 20, centerY],
      [centerX - 20, centerY - 20],
    ],
    [
      [centerX - 30, centerY - 10],
      [centerX - 10, centerY - 10],
    ],
    // digit 2
    [
      [centerX + 10, centerY - 20],
      [centerX + 30, centerY - 30],
      [centerX + 40, centerY - 15],
      [centerX + 20, centerY + 10],
      [centerX + 35, centerY + 25],
    ],
    // equals sign
    [
      [centerX + 55, centerY - 8],
      [centerX + 85, centerY - 8],
    ],
    [
      [centerX + 55, centerY + 8],
      [centerX + 85, centerY + 8],
    ],
    // question mark
    [
      [centerX + 100, centerY - 25],
      [centerX + 115, centerY - 30],
      [centerX + 125, centerY - 20],
      [centerX + 115, centerY - 5],
      [centerX + 110, centerY + 5],
    ],
    [
      [centerX + 108, centerY + 18],
      [centerX + 112, centerY + 22],
    ],
  ];

  for (const stroke of strokes) {
    await page.mouse.move(stroke[0][0], stroke[0][1]);
    await page.mouse.down();
    for (let i = 1; i < stroke.length; i++) {
      await page.mouse.move(stroke[i][0], stroke[i][1]);
    }
    await page.mouse.up();
    await page.waitForTimeout(20);
  }
}

async function invokeAnswer(page) {
  // Open the AI radial menu by clicking the orb, then click Answer.
  const orb = page.locator('#aiOrb');
  await orb.click();
  await page.waitForTimeout(200);
  const answer = page.locator('[data-ai-action="answer"]');
  await expect(answer).toBeVisible();
  await answer.click();
}

async function waitForAIResponse(page, timeoutMs = 120000) {
  const status = page.locator('#status');
  await status.waitFor({ state: 'visible' });
  // Wait until status stops saying "Thinking" and returns to Ready.
  await expect.poll(
    async () => {
      const text = (await status.textContent() || '').trim();
      return text;
    },
    {
      message: 'AI did not finish thinking',
      timeout: timeoutMs,
      intervals: [500, 1000, 2000],
    }
  ).not.toMatch(/Observing|Sending|Thinking/i);

  const finalStatus = (await status.textContent() || '').trim();
  return finalStatus;
}

async function openLocalAccess(page) {
  await page.goto('/', { waitUntil: 'networkidle' });
  const chooseOpen = page.locator('#accessChooseOpen');
  if (await chooseOpen.isVisible().catch(() => false)) {
    await chooseOpen.click();
    await page.locator('#accessConfirmOpen').click();
    await page.waitForURL(/\/(index\.html)?$/, { timeout: 10000 });
  }
}

test('AI answers a handwritten equation in English', async ({ page }) => {
  test.setTimeout(180000);

  // Intercept the AI command response to verify the model returns English text.
  let aiResponseBody = null;
  await page.route('/api/ai/command', async (route) => {
    const response = await route.fetch();
    try {
      aiResponseBody = await response.json();
    } catch {}
    await route.fulfill({ response });
  });

  await openLocalAccess(page);
  await expect(page.locator('#screen')).toBeVisible({ timeout: 10000 });
  await closeOverlays(page);
  await ensurePenMode(page);

  // Disable auto AI so only the manual action triggers a request.
  await page.evaluate(() => {
    const toggle = document.querySelector('#auto');
    if (toggle && toggle.classList.contains('active')) toggle.click();
  });

  const viewport = page.locator('#viewport');
  const box = await viewport.boundingBox();
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  await drawEquation(page, centerX, centerY);
  await page.waitForTimeout(300);

  await invokeAnswer(page);

  const finalStatus = await waitForAIResponse(page, 120000);
  await page.waitForTimeout(2000);

  // Take a screenshot for manual inspection.
  await page.screenshot({ path: 'tests/e2e/report/ai-answer-result.png', fullPage: true });

  // The response must not be a service error.
  expect(finalStatus).not.toMatch(/AI service returned an invalid response|AI service rejected the request|No displayable content/i);

  // Verify the AI command returned a successful English answer.
  expect(aiResponseBody).not.toBeNull();
  expect(Array.isArray(aiResponseBody?.commands)).toBe(true);
  expect(aiResponseBody.commands.length).toBeGreaterThan(0);
  expect(aiResponseBody.intent).toMatch(/answer/i);
  const commandText = aiResponseBody.commands.map(c => c?.text || c?.latex || '').join(' ').toLowerCase();
  expect(commandText).toMatch(/[a-z0-9]/);
  expect(commandText).not.toMatch(/[一-鿿぀-ゟ゠-ヿ]/);
});
