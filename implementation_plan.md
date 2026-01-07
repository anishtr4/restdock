# Implementation Plan - Scrollable Tabs

## Goal
Implement a robust scrollable tab bar with "Next" and "Previous" navigation buttons to handle cases where tabs exceed the container width.

## User Review Required
- None

## Proposed Changes

### [NEW] `src/components/ScrollableTabs.tsx`
Create a new component to handle the tab strip logic:
-   **Props**:
    -   `tabs`: Array of `Tab` objects.
    -   `activeTabId`: ID of the currently active tab.
    -   `onTabClick`: Handler for selecting a tab.
    -   `onTabClose`: Handler for closing a tab.
    -   `onNewTab`: Handler for creating a new tab.
-   **Features**:
    -   Container with `overflow-x-auto` (hidden scrollbar).
    -   `ChevronLeft` and `ChevronRight` buttons on the sides.
    -   `scrollBy` logic to scroll the container on button click.
    -   Optional: Detect scroll position to disable buttons (start/end).

### [MODIFY] `src/App.tsx`
-   Import `ScrollableTabs`.
-   Replace the existing mapped tab implementation with `<ScrollableTabs ... />`.

## Verification Plan
### Manual Verification
1.  Open enough tabs to overflow the container.
2.  Click "Next" button -> Tabs should scroll right.
3.  Click "Prev" button -> Tabs should scroll left.
4.  Verify tab selection and closing still works.
