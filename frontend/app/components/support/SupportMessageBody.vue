<template>
  <div
    class="support-message-body text-sm leading-relaxed text-ink"
    v-html="html"
  />
</template>

<script setup lang="ts">
import { expandUploadUrls } from "~/lib/rich-text/uploads";

const props = defineProps<{
  html: string;
}>();

const { $api } = useNuxtApp();

function sanitizeClientHtml(html: string): string {
  if (!html?.trim()) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s(on\w+|style)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/href=["']javascript:[^"']*["']/gi, 'href="#"')
    .replace(/<img([^>]*)\ssrc=["']data:[^"']*["']/gi, "");
}

const html = computed(() => {
  const sanitized = sanitizeClientHtml(props.html);
  return expandUploadUrls(sanitized, (path) => $api.getFileUrl(path));
});
</script>

<style>
.support-message-body p {
  margin: 0.35rem 0;
}

.support-message-body ul,
.support-message-body ol {
  margin: 0.35rem 0;
  padding-left: 1.5rem;
}

.support-message-body ul {
  list-style-type: disc;
  list-style-position: outside;
}

.support-message-body ol {
  list-style-type: decimal;
  list-style-position: outside;
}

.support-message-body li {
  display: list-item;
}

.support-message-body li > p {
  margin: 0.15rem 0;
}

.support-message-body pre {
  margin: 0.5rem 0;
  overflow-x: auto;
  border-radius: 0.375rem;
  background: #f3f4f6;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
}

.support-message-body code {
  border-radius: 0.25rem;
  background: #f3f4f6;
  padding: 0.1rem 0.25rem;
  font-size: 0.8125rem;
}

.support-message-body a {
  color: #2563eb;
  text-decoration: underline;
}

.support-message-body img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0.5rem 0;
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb;
}
</style>
