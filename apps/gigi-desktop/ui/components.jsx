import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import { DateInput } from '@astryxdesign/core/DateInput';
import { Selector } from '@astryxdesign/core/Selector';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Card } from '@astryxdesign/core/Card';
import { Banner } from '@astryxdesign/core/Banner';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';

export { Heading, Text, VStack, HStack, Card, Banner };
// WebKit in the bundled custom-protocol view exposes CSS anchors but does not
// reliably display the anchored option surface. Use Astryx's modal sheet there.
const anchoredControls = () =>
  !globalThis.__TAURI__ && globalThis.CSS?.supports?.('anchor-name', '--gigi');
const textContent = (node) =>
  React.Children.toArray(node)
    .map((value) =>
      typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : React.isValidElement(value)
          ? textContent(value.props.children)
          : ''
    )
    .join(' ')
    .trim();
export function B({
  children,
  label,
  disabled = false,
  primary = false,
  danger = false,
  variant,
  size = 'lg',
  ...props
}) {
  return (
    <Button
      width={props.className?.includes('gigi-record-row') ? '100%' : undefined}
      {...props}
      label={label || textContent(children) || 'Action'}
      variant={variant || (danger ? 'destructive' : primary ? 'primary' : 'secondary')}
      isDisabled={disabled}
      size={size}
    >
      {typeof children === 'string' ? undefined : children}
    </Button>
  );
}
export function Field({
  id,
  name,
  label,
  value,
  defaultValue = '',
  onChange,
  textarea = false,
  type = 'text',
  help,
  required,
  disabled,
  readOnly,
  ...props
}) {
  const [draft, setDraft] = useState(String(value ?? defaultValue ?? ''));
  useEffect(() => {
    if (value !== undefined) setDraft(String(value ?? ''));
  }, [value]);
  const common = {
    ...props,
    id,
    htmlName: name,
    label,
    value: draft,
    isRequired: required,
    required,
    isDisabled: disabled,
    isReadOnly: readOnly,
    description: help,
    size: 'lg',
    width: '100%'
  };
  const update = (next, event) => {
    setDraft(next ?? '');
    onChange?.(next ?? '', event);
  };
  if (textarea) return <TextArea {...common} onChange={update} />;
  if (type === 'date') return <DateField {...common} name={name} value={draft} onChange={update} />;
  return (
    <TextInput
      {...common}
      type={['email', 'tel', 'url', 'search', 'password'].includes(type) ? type : 'text'}
      inputMode={type === 'number' ? 'decimal' : undefined}
      onChange={update}
    />
  );
}
function DateField({ id, name, value, onChange, ...props }) {
  const input = useRef(null);
  const visible = useRef(null);
  useEffect(() => {
    if (input.current) input.current.focus = (options) => visible.current?.focus(options);
  }, []);
  const update = (next) => {
    onChange(next || '');
    if (input.current) {
      input.current.value = next || '';
      input.current.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };
  const data = Object.fromEntries(Object.entries(props).filter(([key]) => key.startsWith('data-')));
  const clean = Object.fromEntries(
    Object.entries(props).filter(
      ([key]) => !key.startsWith('data-') && key !== 'htmlName' && key !== 'isReadOnly'
    )
  );
  return (
    <VStack gap={1}>
      <input type="hidden" ref={input} id={id} name={name} value={value} {...data} />
      {anchoredControls() ? (
        <DateInput
          {...clean}
          ref={visible}
          id={`${id}-display`}
          value={value || undefined}
          onChange={update}
        />
      ) : (
        <TextInput
          {...clean}
          ref={visible}
          id={`${id}-display`}
          value={value}
          placeholder="YYYY-MM-DD"
          onChange={update}
        />
      )}
    </VStack>
  );
}
// The hidden native field is the compatibility boundary with the existing
// transactional controller's FormData and delegated change handlers. The visible
// control, keyboard model, selection and overlay are Astryx's real Selector.
export function Choice({
  id,
  name,
  label,
  value = '',
  options = [],
  onChange,
  help,
  disabled,
  required,
  ...props
}) {
  const [selected, setSelected] = useState(String(value ?? ''));
  const input = useRef(null);
  const visible = useRef(null);
  useEffect(() => setSelected(String(value ?? '')), [value]);
  useEffect(() => {
    if (input.current) input.current.focus = (options) => visible.current?.focus(options);
  }, []);
  const items = options.map((item) =>
    Array.isArray(item)
      ? { value: String(item[0]), label: item[1] }
      : typeof item === 'string'
        ? { value: item, label: item }
        : item
  );
  return (
    <VStack gap={1}>
      <input
        ref={input}
        type="hidden"
        id={id}
        name={name}
        value={selected}
        data-gigi-required={required ? label : undefined}
        {...props}
      />
      <Selector
        ref={visible}
        id={`${id}-display`}
        label={label}
        value={selected}
        options={items}
        description={help}
        isDisabled={disabled}
        isRequired={required}
        size="lg"
        width="100%"
        presentation={anchoredControls() ? 'popover' : 'bottom-sheet'}
        onChange={(next) => {
          setSelected(next);
          if (input.current) {
            input.current.value = next;
            input.current.dispatchEvent(new Event('change', { bubbles: true }));
          }
          onChange?.(next);
        }}
      />
    </VStack>
  );
}
export function Check({ id, name, label, value = false, onChange, ...props }) {
  const [checked, setChecked] = useState(Boolean(value));
  useEffect(() => setChecked(Boolean(value)), [value]);
  return (
    <CheckboxInput
      id={id}
      htmlName={name}
      label={label}
      value={checked}
      {...props}
      onChange={(next, event) => {
        setChecked(next);
        onChange?.(next, event);
      }}
    />
  );
}
export function Panel({ title, children, actions, id, ...props }) {
  return (
    <Card id={id} padding={5} {...props}>
      <VStack gap={4}>
        {title && (
          <HStack gap={3} className="gigi-section-head">
            {React.isValidElement(title) ? title : <Heading level={2}>{title}</Heading>}
            {actions}
          </HStack>
        )}
        {children}
      </VStack>
    </Card>
  );
}
export function PageHeading({ title, description, actions }) {
  return (
    <HStack gap={4} className="gigi-page-head">
      <VStack gap={2}>
        <Heading level={1}>{title}</Heading>
        {description && <Text color="secondary">{description}</Text>}
      </VStack>
      {actions && <HStack gap={2}>{actions}</HStack>}
    </HStack>
  );
}
export function Message({ children, error = false, status, title }) {
  return (
    <Banner
      status={status || (error ? 'error' : 'info')}
      title={title || (error ? 'Check this step' : 'Workspace update')}
      description={children}
      role={error ? 'alert' : 'status'}
    />
  );
}
export function Disclosure({ title, children, open = false, ...props }) {
  return (
    <details open={open || undefined} {...props}>
      <summary>{title}</summary>
      <VStack gap={3}>{children}</VStack>
    </details>
  );
}
