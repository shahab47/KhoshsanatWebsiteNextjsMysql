import '@tiptap/core';
import { EditorInstance } from 'novel';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    table: {
      addColumnBefore: () => ReturnType;
      addColumnAfter: () => ReturnType;
      addRowBefore: () => ReturnType;
      addRowAfter: () => ReturnType;
      deleteColumn: () => ReturnType;
      deleteRow: () => ReturnType;
      deleteTable: () => ReturnType;
      mergeCells: () => ReturnType;
      splitCell: () => ReturnType;
      insertTable: (options: { rows: number; cols: number; withHeaderRow?: boolean }) => ReturnType;
    };
  }
}

// همچنین اگر نیاز است خود EditorInstance این متدها را بشناسد
declare module 'novel' {
  interface EditorInstance {
    chain(): any; // به صورت موقت
  }
}