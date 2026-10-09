import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GroupSelector from '@/components/GroupSelector';

/**
 * Suite 6 -- the first component test, on GroupSelector.
 *
 * Every other suite in this project is pure logic. That is the right default, and it is
 * also why a whole class of bug survives: a component that renders nothing, a button that
 * never fires its handler, a dropdown that stays open after the user is done with it.
 * None of that is visible to a test that never renders anything.
 *
 * The behaviour asserted here is what an operator relies on and cannot easily check by
 * reading the code:
 *
 *   - the label reflects the selection, so a trainee does not act on the wrong group
 *   - the overlay backdrop closes the menu, which is the only way to dismiss it on touch
 *   - the "all groups" row appears only when the caller asks for it, because for a
 *     single-group role it would be a dead control that appears to do something
 *
 * The group list is hardcoded in the component, so the expectations below are written
 * against what it actually renders rather than against a fixture. If that list ever
 * comes from the database, these assertions still hold -- they check that the selection
 * round-trips, not what the groups are named.
 */

function setup(props: Partial<React.ComponentProps<typeof GroupSelector>> = {}) {
  const onSelectGroup = vi.fn();
  const user = userEvent.setup();
  const view = render(
    <GroupSelector selectedGroupId={1} onSelectGroup={onSelectGroup} {...props} />,
  );
  // Convenience wrappers bound to this instance's container.
  const root = view.container;
  return {
    user,
    onSelectGroup,
    container: root,
    menu: () => menuIn(root),
    groupRow: (name: RegExp) => groupRowIn(root, name),
    allGroupsRow: () => allGroupsRowIn(root),
  };
}

/**
 * The trigger button is the only one present while the menu is closed.
 *
 * Note the trigger's own label is the selected group's name, so it also matches a query
 * like /الفرقة الأولى/ whenever group 1 is the current one. Row lookups are therefore
 * scoped to the menu container rather than the whole document -- an unscoped
 * getByRole finds both the trigger and the row and reports "found multiple elements",
 * which looks like a component bug but is really an ambiguous query.
 */
const trigger = () => screen.getByRole('button');

/**
 * The dropdown panel, searched inside one component's own container.
 *
 * Scoping to the container rather than to document matters wherever two instances are
 * mounted in one test: the panel class alone would then match twice. render() returns
 * its container, so the scope travels with the instance.
 */
function menuIn(root: HTMLElement): HTMLElement {
  const panel = root.querySelector('div.animate-scale-in');
  if (!panel) throw new Error('the menu is not open');
  return panel as HTMLElement;
}

/** A group row inside one instance's open menu, excluding that instance's trigger. */
const groupRowIn = (root: HTMLElement, name: RegExp) =>
  within(menuIn(root)).getByRole('button', { name });

/** The "all groups" row, which is not a group row. */
const allGroupsRowIn = (root: HTMLElement) =>
  within(menuIn(root)).getByRole('button', { name: /جميع الفرق/ });

describe('GroupSelector renders the current selection', () => {
  it('shows the selected group name on the trigger', () => {
    setup({ selectedGroupId: 2 });
    expect(trigger()).toHaveTextContent('الفرقة الثانية');
  });

  it('shows a different label for a different selection', () => {
    // The point of the label: an admin filtering by group has to be able to tell, at a
    // glance, which group they are looking at. A label that ignores the prop would make
    // every filtered view indistinguishable.
    const { unmount } = render(
      <GroupSelector selectedGroupId={3} onSelectGroup={vi.fn()} />,
    );
    expect(screen.getByRole('button')).toHaveTextContent('الفرقة الثالثة');
    unmount();
  });

  it('falls back to a prompt when the selection matches no group', () => {
    // selectedGroupId 0 means "all groups", which is only reachable with showAllOption,
    // so the component must not render an empty button.
    setup({ selectedGroupId: 99 });
    expect(trigger()).toHaveTextContent('اختر الفرقة');
  });

  it('renders right-to-left, since the whole app is Arabic', () => {
    const { container } = render(
      <GroupSelector selectedGroupId={1} onSelectGroup={vi.fn()} />,
    );
    expect(container.firstElementChild).toHaveAttribute('dir', 'rtl');
  });
});

describe('the menu opens, reports a choice, and closes', () => {
  it('is closed on first render', () => {
    const { container } = setup();
    // No menu is mounted at all, which is stronger than an empty one.
    expect(container.querySelector('div.animate-scale-in')).toBeNull();
  });

  it('opens when the trigger is pressed', async () => {
    const { user, groupRow } = setup();
    await user.click(trigger());
    expect(groupRow(/الفرقة الأولى/)).toBeTruthy();
  });

  it('closes again when the trigger is pressed a second time', async () => {
    const { user, container } = setup();
    const own = () => container.querySelector('button') as Element;
    await user.click(own());
    expect(container.querySelector('div.animate-scale-in')).not.toBeNull();
    await user.click(own());
    // The panel is gone, which is what "closed" means to the operator.
    expect(container.querySelector('div.animate-scale-in')).toBeNull();
  });

  it('reports the chosen group and closes', async () => {
    // This is the whole contract of the component: one selection in, one callback out,
    // menu dismissed so the operator can see the result.
    const { user, onSelectGroup, groupRow, container } = setup();
    await user.click(trigger());
    await user.click(groupRow(/الفرقة الثالثة/));
    expect(onSelectGroup).toHaveBeenCalledExactlyOnceWith(3);
    // Dismissing after a choice is part of the contract -- the operator needs to see
    // the list they just filtered, not keep re-dismissing it.
    expect(container.querySelector('div.animate-scale-in')).toBeNull();
  });

  it('reports 0 for "all groups", and shows that row only when asked', async () => {
    // showAllOption=false means the caller is a single-group role, where an "all groups"
    // row would be a control that cannot do what it looks like it does.
    const { user, onSelectGroup, menu } = setup({ showAllOption: false });
    await user.click(trigger());
    expect(within(menu()).queryByRole('button', { name: /جميع الفرق/ })).toBeNull();

    // A second instance mounted while the first is still on the page, so every lookup
    // is scoped to its own container rather than to the document.
    const second = setup({ showAllOption: true });
    await second.user.click(second.container.querySelector('button') as Element);
    await second.user.click(second.allGroupsRow());
    expect(second.onSelectGroup).toHaveBeenCalledWith(0);
    expect(onSelectGroup).not.toHaveBeenCalled();
  });

  it('dismisses on the backdrop without selecting anything', async () => {
    // On touch there is no hover and no Escape affordance here; the fixed inset-0
    // overlay is the only way out. If it stops working the menu is stuck open.
    const { user, onSelectGroup, groupRow, container } = setup();
    await user.click(trigger());
    expect(groupRow(/الفرقة الأولى/)).toBeTruthy();

    const backdrop = document.querySelector('div.fixed.inset-0');
    expect(backdrop, 'the dismiss backdrop is missing').toBeTruthy();
    await user.click(backdrop as Element);

    expect(container.querySelector('div.animate-scale-in')).toBeNull();
    // Dismissing is not a selection -- reporting here would silently change the filter.
    expect(onSelectGroup).not.toHaveBeenCalled();
  });
});

describe('the selected row is marked', () => {
  it('shows a check only on the current group', async () => {
    const { user, groupRow } = setup({ selectedGroupId: 2 });
    await user.click(trigger());

    const rows = [
      groupRow(/الفرقة الأولى/),
      groupRow(/الفرقة الثانية/),
      groupRow(/الفرقة الثالثة/),
    ];

    // The check is a lucide Check icon, so it carries no text of its own; what it does
    // carry is a distinct class on the selected row.
    expect(rows[1].className).toContain('bg-karooz-gold');
    expect(rows[0].className).not.toContain('bg-karooz-gold');
    expect(rows[2].className).not.toContain('bg-karooz-gold');
  });
});