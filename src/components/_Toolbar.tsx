/**
 * src/components/_Toolbar.tsx
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { createPortal } from 'react-dom';
import { defaultDocsBlock, enabledDocsBlocks } from './blocks.js';
import { getActiveStyle, isActiveAnnotation, isActiveDecorator } from '@portabletext/editor/selectors';
import { safeLink, schema } from '../lib/schema.js';
import { useEditor, useEditorSelector } from '@portabletext/editor';
import { useEffect, useId, useRef, useState } from 'react';

// COMPONENTS
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@terra-symposium/styling/ui';
import { Link, Redo, TextBold, TextItalic, TextStrikethrough, TextUnderline, Undo } from '@carbon/icons-react';

// TYPES
import type { DocsBlockOptions } from './blocks.js';
import type { EditorSelection } from '@portabletext/editor';
import type { JSX } from 'react';

/*//////////////////////////////////////////////////
HELPERS
//////////////////////////////////////////////////*/

/**
 * Terra's style dropdown and Carbon formatting controls, without website UI dependencies.
 *
 * @param blocks Optional block availability configuration for the active editor.
 *
 * @return Formatting toolbar controls for the current Portable Text editor.
 */
export function Toolbar({ blocks }: { blocks?: DocsBlockOptions | undefined }): JSX.Element {
	const editor = useEditor();
	const snapshot = useEditorSelector(editor, s => s);
	const selection = useRef<EditorSelection>(null);
	const linkDialog = useRef<HTMLDialogElement>(null);
	const linkId = useId();
	const [linkValue, setLinkValue] = useState('');
	const [linkErr, setLinkErr] = useState(false);
	const [blockSelection, setBlockSelection] = useState('');
	const [slot, setSlot] = useState<HTMLElement | null>(null);
	useEffect(() => setSlot(document.querySelector<HTMLElement>('.terra-docs-formatting-slot')), []);
	const controls = (
		<div className='terra-docs-toolbar' role='toolbar' aria-label='Editor controls'>
			<Select
				value={getActiveStyle(snapshot) ?? 'normal'}
				onValueChange={s => {
					if (selection.current) editor.send({ type: 'select', at: selection.current });
					editor.send({ type: 'style.toggle', style: s });
					editor.send({ type: 'focus' });
				}}
			>
				<SelectTrigger
					className='terra-docs-select'
					aria-label='Block type'
					onPointerDownCapture={() => {
						selection.current = editor.getSnapshot().context.selection;
					}}
					onKeyDownCapture={() => {
						selection.current = editor.getSnapshot().context.selection;
					}}
				>
					<SelectValue placeholder='Text' />
				</SelectTrigger>
				<SelectContent className='terra-docs-select-menu' position='popper' sideOffset={8} onCloseAutoFocus={e => e.preventDefault()}>
					{schema.styles.map(({ name: n, title: t }) => (
						<SelectItem key={n} value={n} className='terra-docs-select-item'>
							{t}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<span className='terra-docs-toolbar-divider' aria-hidden='true' />
			{[
				{ Icon: TextBold, name: 'strong', label: 'Bold' },
				{ Icon: TextItalic, name: 'em', label: 'Italic' },
				{ Icon: TextUnderline, name: 'underline', label: 'Underline' },
				{ Icon: TextStrikethrough, name: 'strike-through', label: 'Strikethrough' },
			].map(({ Icon, name: n, label: l }) => (
				<Button
					key={n}
					variant='ghost'
					size='xs'
					aria-label={l}
					title={l}
					aria-pressed={isActiveDecorator(n)(snapshot)}
					onMouseDown={event => event.preventDefault()}
					onClick={() => {
						editor.send({ type: 'decorator.toggle', decorator: n });
						editor.send({ type: 'focus' });
					}}
				>
					<Icon size={16} aria-hidden='true' />
				</Button>
			))}
			<Button
				variant='ghost'
				size='xs'
				aria-label='Link'
				title='Link'
				aria-pressed={isActiveAnnotation('link')(snapshot)}
				onMouseDown={e => e.preventDefault()}
				onClick={() => {
					selection.current = editor.getSnapshot().context.selection;
					setLinkValue('');
					setLinkErr(false);
					linkDialog.current?.showModal();
				}}
			>
				<Link size={16} aria-hidden='true' />
			</Button>
			<Select
				value={blockSelection}
				onValueChange={v => {
					const type = v as ReturnType<typeof enabledDocsBlocks>[number];
					if (!type) return;
					editor.send({
						type: 'insert.block object',
						blockObject: { name: type, value: defaultDocsBlock(type) },
						placement: 'after',
					});
					setBlockSelection('');
					editor.send({ type: 'focus' });
				}}
			>
				<SelectTrigger aria-label='Insert rich block'>
					<SelectValue placeholder='Insert block' />
				</SelectTrigger>
				<SelectContent>
					{enabledDocsBlocks(blocks).map(t => (
						<SelectItem key={t} value={t}>
							{t}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{blocks?.inlineMath !== false && (
				<Button
					variant='ghost'
					size='xs'
					aria-label='Insert inline math'
					title='Insert inline math'
					onClick={() => {
						editor.send({
							type: 'insert.inline object',
							inlineObject: { name: 'math', value: { code: 'E = mc^2', inline: true } },
						});
						editor.send({ type: 'focus' });
					}}
				>
					∑
				</Button>
			)}
			<Button
				variant='ghost'
				size='xs'
				aria-label='Undo'
				title='Undo'
				onMouseDown={e => e.preventDefault()}
				onClick={() => {
					editor.send({ type: 'history.undo' });
					editor.send({ type: 'focus' });
				}}
			>
				<Undo size={16} aria-hidden='true' />
			</Button>
			<Button
				variant='ghost'
				size='xs'
				aria-label='Redo'
				title='Redo'
				onMouseDown={e => e.preventDefault()}
				onClick={() => {
					editor.send({ type: 'history.redo' });
					editor.send({ type: 'focus' });
				}}
			>
				<Redo size={16} aria-hidden='true' />
			</Button>
			<dialog ref={linkDialog} className='terra-docs-link-dialog' aria-labelledby={`${linkId}-title`}>
				<form
					onSubmit={e => {
						e.preventDefault();
						const href = safeLink(linkValue);
						if (!href) {
							setLinkErr(true);
							return;
						}
						if (selection.current) editor.send({ type: 'select', at: selection.current });
						editor.send({ type: 'annotation.add', annotation: { name: 'link', value: { href } } });
						linkDialog.current?.close();
						editor.send({ type: 'focus' });
					}}
				>
					<h2 id={`${linkId}-title`}>Add link</h2>
					<label htmlFor={`${linkId}-url`}>URL</label>
					<Input id={`${linkId}-url`} autoFocus required value={linkValue} onChange={e => setLinkValue(e.currentTarget.value)} placeholder='https://example.com' />
					{linkErr && <p role='alert'>Enter a valid web, email, or relative URL.</p>}
					<div>
						<Button
							variant='ghost'
							onClick={() => {
								linkDialog.current?.close();
								editor.send({ type: 'focus' });
							}}
						>
							Cancel
						</Button>
						<Button type='submit'>Add link</Button>
					</div>
				</form>
			</dialog>
		</div>
	);
	return slot ? createPortal(controls, slot) : controls;
}
