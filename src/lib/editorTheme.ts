import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

const baseTheme = EditorView.theme({
    "&": {
        color: "var(--foreground)",
        backgroundColor: "transparent"
    },
    ".cm-content": {
        caretColor: "var(--primary)"
    },
    "&.cm-focused .cm-cursor": {
        borderLeftColor: "var(--primary)"
    },
    "&.cm-focused .cm-selectionBackground, ::selection": {
        backgroundColor: "var(--accent)",
        opacity: "0.3"
    },
    ".cm-gutters": {
        backgroundColor: "transparent",
        color: "var(--muted-foreground)",
        border: "none"
    },
    ".cm-activeLine": {
        backgroundColor: "var(--muted)",
        opacity: "0.5"
    },
    ".cm-activeLineGutter": {
        backgroundColor: "transparent",
        color: "var(--primary)"
    }
});

const appHighlightStyle = HighlightStyle.define([
    { tag: t.keyword, color: "var(--token-keyword)" },
    { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: "var(--foreground)" },
    { tag: [t.function(t.variableName), t.labelName], color: "var(--token-keyword)" }, // Functions map to same as keyword/primary for branding
    { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "var(--token-number)" },
    { tag: [t.definition(t.name), t.separator], color: "var(--foreground)" },
    { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: "var(--token-number)" },
    { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: "var(--token-string)" },
    { tag: [t.meta, t.comment], color: "var(--token-comment)" },
    { tag: t.strong, fontWeight: "bold" },
    { tag: t.emphasis, fontStyle: "italic" },
    { tag: t.strikethrough, textDecoration: "line-through" },
    { tag: t.link, color: "var(--token-string)", textDecoration: "underline" },
    { tag: t.heading, fontWeight: "bold", color: "var(--primary)" },
    { tag: [t.atom, t.bool, t.special(t.variableName)], color: "var(--token-number)" },
    { tag: [t.processingInstruction, t.string, t.inserted], color: "var(--token-string)" }
]);

export const appEditorTheme: Extension = [
    baseTheme,
    syntaxHighlighting(appHighlightStyle)
];
