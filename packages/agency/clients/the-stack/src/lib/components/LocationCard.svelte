<script lang="ts">
	/**
	 * LocationCard Component
	 *
	 * Individual location with image, name, and address.
	 */

	interface Props {
		image: string;
		name: string;
		address: string;
	}

	let { image, name, address }: Props = $props();
</script>

<li class="locations_item">
	<div class="margin-bottom-20">
		<div class="locations_visual">
			<img src={image} loading="lazy" alt="" class="img-cover" />
		</div>
	</div>
	<div>
		<div class="margin-bottom-8">
			<p class="heading-style-h4">{name}</p>
		</div>
		<div class="text-color-lightgrey">
			<p class="text-size-eyebrow">{address}</p>
		</div>
	</div>
</li>

<style>
	.locations_item {
		list-style: none;
	}

	.locations_visual {
		aspect-ratio: 330 / 180;
		border-radius: var(--location-radius);
		width: 100%;
		position: relative;
		overflow: hidden;
	}
</style>
