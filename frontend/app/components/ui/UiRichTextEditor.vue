<template>
  <div
    class="overflow-hidden rounded-lg border border-border-warm bg-paper focus-within:border-primary-500"
    :class="{ 'opacity-60': disabled }"
  >
    <div
      v-if="editor"
      class="flex flex-wrap gap-1 border-b border-border-warm bg-surface px-2 py-1.5"
    >
      <button
        v-for="item in toolbarItems"
        :key="item.name"
        type="button"
        class="rounded px-2 py-1 text-xs font-medium text-ink-muted hover:bg-paper hover:text-ink disabled:opacity-40"
        :class="item.active?.() ? 'bg-primary-100 text-primary-700' : ''"
        :disabled="disabled || (item.name === 'image' && isUploadingImage)"
        :title="item.title"
        @mousedown.prevent
        @click="item.action()"
      >
        {{ item.label }}
      </button>
    </div>
    <input
      ref="imageInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="hidden"
      @change="handleImageSelect"
    />
    <EditorContent
      :editor="editor"
      class="support-rich-editor px-3 py-2 text-sm text-ink"
      :style="{ minHeight: `${minHeight}px` }"
    />
  </div>
</template>

<script setup lang="ts">
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import {
  collapseUploadUrls,
  expandUploadUrls,
  prepareSupportImageUpload,
  validateSupportImage,
} from "~/lib/rich-text/uploads";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
    minHeight?: number;
    disabled?: boolean;
    enableImages?: boolean;
    uploadImage?: (file: File) => Promise<string>;
  }>(),
  {
    placeholder: "",
    minHeight: 160,
    disabled: false,
    enableImages: true,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const { t } = useI18n();
const { $api } = useNuxtApp();
const { alert } = useDialog();

const imageInputRef = ref<HTMLInputElement | null>(null);
const isUploadingImage = ref(false);

function getUploadsBase() {
  return $api.getFileUrl("support_attachments").replace(/\/support_attachments\/?$/, "");
}

function displayHtml(html: string) {
  if (!props.enableImages || !html) return html;
  return expandUploadUrls(html, (path) => $api.getFileUrl(path));
}

function storageHtml(html: string) {
  if (!props.enableImages || !html) return html;
  return collapseUploadUrls(html, getUploadsBase());
}

async function defaultUploadImage(file: File): Promise<string> {
  const prepared = await prepareSupportImageUpload(file);
  const form = new FormData();
  form.append("image", prepared);
  const { path } = await $api.uploadSupportAttachment(form);
  return $api.getFileUrl(path);
}

async function uploadAndInsertImage(file: File) {
  const typeError = validateSupportImage(file);
  if (typeError) {
    await alert(t(typeError));
    return;
  }

  isUploadingImage.value = true;
  try {
    const upload = props.uploadImage ?? defaultUploadImage;
    const url = await upload(file);
    editor.value
      ?.chain()
      .focus()
      .setImage({ src: url, alt: file.name })
      .run();
  } catch (err) {
    await alert(err instanceof Error ? err.message : t("common.error"));
  } finally {
    isUploadingImage.value = false;
  }
}

function openImagePicker() {
  if (props.disabled || isUploadingImage.value) return;
  imageInputRef.value?.click();
}

async function handleImageSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  await uploadAndInsertImage(file);
}

async function insertImagesFromFiles(files: File[]) {
  for (const file of files) {
    await uploadAndInsertImage(file);
  }
}

function extractClipboardImageFiles(event: ClipboardEvent): File[] {
  const clipboard = event.clipboardData;
  if (!clipboard) return [];

  const files: File[] = [];
  const seen = new Set<string>();

  for (const file of clipboard.files) {
    if (!file.type.startsWith("image/")) continue;
    const key = `${file.name}:${file.size}:${file.lastModified}`;
    if (seen.has(key)) continue;
    seen.add(key);
    files.push(file);
  }

  for (const item of clipboard.items) {
    if (!item.type.startsWith("image/")) continue;
    const file = item.getAsFile();
    if (!file) continue;
    const key = `${file.name}:${file.size}:${file.lastModified}`;
    if (seen.has(key)) continue;
    seen.add(key);
    files.push(file);
  }

  return files;
}

function handleEditorPaste(_view: unknown, event: ClipboardEvent) {
  if (!props.enableImages || props.disabled || isUploadingImage.value) {
    return false;
  }

  const files = extractClipboardImageFiles(event);
  if (files.length === 0) {
    return false;
  }

  event.preventDefault();
  void insertImagesFromFiles(files);
  return true;
}

const editor = useEditor({
  content: displayHtml(props.modelValue),
  editable: !props.disabled,
  editorProps: {
    handlePaste: handleEditorPaste,
  },
  extensions: [
    StarterKit.configure({
      heading: false,
      blockquote: false,
      horizontalRule: false,
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        rel: "noopener noreferrer",
        target: "_blank",
      },
    }),
    Placeholder.configure({
      placeholder: props.placeholder,
    }),
    ...(props.enableImages
      ? [
          Image.configure({
            inline: false,
            allowBase64: false,
            HTMLAttributes: {
              class: "support-rich-editor__image",
            },
          }),
        ]
      : []),
  ],
  onUpdate: ({ editor: ed }) => {
    const html = ed.isEmpty ? "" : ed.getHTML();
    emit("update:modelValue", storageHtml(html));
  },
});

watch(
  () => props.modelValue,
  (value) => {
    if (!editor.value) return;
    const current = storageHtml(editor.value.getHTML());
    if (value !== current) {
      editor.value.commands.setContent(displayHtml(value || ""), { emitUpdate: false });
    }
  },
);

watch(
  () => props.disabled,
  (value) => {
    editor.value?.setEditable(!value);
  },
);

onBeforeUnmount(() => {
  editor.value?.destroy();
});

function setLink() {
  if (!editor.value) return;
  const previous = editor.value.getAttributes("link").href as string | undefined;
  const url = window.prompt("URL", previous ?? "https://");
  if (url === null) return;
  if (url === "") {
    editor.value.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }
  editor.value.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
}

const toolbarItems = computed(() => {
  const ed = editor.value;
  if (!ed) return [];

  const items = [
    {
      name: "bold",
      label: "B",
      title: "Bold",
      active: () => ed.isActive("bold"),
      action: () => ed.chain().focus().toggleBold().run(),
    },
    {
      name: "italic",
      label: "I",
      title: "Italic",
      active: () => ed.isActive("italic"),
      action: () => ed.chain().focus().toggleItalic().run(),
    },
    {
      name: "bullet",
      label: "•",
      title: "Bullet list",
      active: () => ed.isActive("bulletList"),
      action: () => ed.chain().focus().toggleBulletList().run(),
    },
    {
      name: "ordered",
      label: "1.",
      title: "Numbered list",
      active: () => ed.isActive("orderedList"),
      action: () => ed.chain().focus().toggleOrderedList().run(),
    },
    {
      name: "code",
      label: "</>",
      title: "Inline code",
      active: () => ed.isActive("code"),
      action: () => ed.chain().focus().toggleCode().run(),
    },
    {
      name: "codeBlock",
      label: "{ }",
      title: "Code block",
      active: () => ed.isActive("codeBlock"),
      action: () => ed.chain().focus().toggleCodeBlock().run(),
    },
    {
      name: "link",
      label: "Link",
      title: "Link",
      active: () => ed.isActive("link"),
      action: setLink,
    },
  ];

  if (props.enableImages) {
    items.push({
      name: "image",
      label: isUploadingImage.value ? "…" : t("support.attachImage"),
      title: t("support.attachImage"),
      active: () => false,
      action: openImagePicker,
    });
  }

  return items;
});
</script>

<style>
.support-rich-editor .tiptap {
  outline: none;
  min-height: inherit;
}

.support-rich-editor .tiptap p {
  margin: 0.35rem 0;
}

.support-rich-editor .tiptap ul,
.support-rich-editor .tiptap ol {
  margin: 0.35rem 0;
  padding-left: 1.5rem;
}

.support-rich-editor .tiptap ul {
  list-style-type: disc;
  list-style-position: outside;
}

.support-rich-editor .tiptap ol {
  list-style-type: decimal;
  list-style-position: outside;
}

.support-rich-editor .tiptap li {
  display: list-item;
}

.support-rich-editor .tiptap li > p {
  margin: 0.15rem 0;
}

.support-rich-editor .tiptap pre {
  margin: 0.5rem 0;
  overflow-x: auto;
  border-radius: 0.375rem;
  background: #f3f4f6;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
}

.support-rich-editor .tiptap code {
  border-radius: 0.25rem;
  background: #f3f4f6;
  padding: 0.1rem 0.25rem;
  font-size: 0.8125rem;
}

.support-rich-editor .tiptap img,
.support-rich-editor__image {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0.5rem 0;
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb;
}

.support-rich-editor .tiptap p.is-editor-empty:first-child::before {
  color: #9ca3af;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
</style>
