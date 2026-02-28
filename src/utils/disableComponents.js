import { logger } from '#utils';
import { ComponentType, ButtonStyle, MessageFlags } from 'discord.js';
export async function disableComponents(msg) {
	try {
		if (!msg?.components?.length) return;

		const disabled = msg.components.map((c) => {
			const j = c.toJSON();

			if (c.type === ComponentType.ActionRow) {
				j.components = c.components.map((s) => {
					const sj = s.toJSON();
					return sj.type === ComponentType.Button && sj.style === ButtonStyle.Link
						? sj
						: { ...sj, disabled: true };
				});
			} else if ([ComponentType.Container, ComponentType.Section].includes(c.type)) {
				j.components = _disableNested(c.components);

				if (c.accessory?.type === ComponentType.Button) {
					const aj = c.accessory.toJSON();
					j.accessory = aj.style === ButtonStyle.Link ? aj : { ...aj, disabled: true };
				}
			}

			return j;
		});

		await msg.edit({
			components: disabled,
			flags: MessageFlags.IsComponentsV2,
		});
	} catch (err) {
		if (![10008, 10003, 50001].includes(err.code)) {
			logger.error('Utils', 'disableComponents error', err);
		}
	}
}

export function _disableNested(comps) {
	return comps.map((c) => {
		const j = c.toJSON();

		if (c.type === ComponentType.ActionRow) {
			j.components = c.components.map((s) => {
				const sj = s.toJSON();
				return sj.type === ComponentType.Button && sj.style === ButtonStyle.Link
					? sj
					: { ...sj, disabled: true };
			});
		} else if ([ComponentType.Container, ComponentType.Section].includes(c.type)) {
			j.components = _disableNested(c.components);

			if (c.accessory?.type === ComponentType.Button) {
				const aj = c.accessory.toJSON();
				j.accessory = aj.style === ButtonStyle.Link ? aj : { ...aj, disabled: true };
			}
		}

		return j;
	});
}
