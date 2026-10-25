<script setup lang="ts">
import { computed } from 'vue';
import type { SettingsField } from '@/core/settings/schema';
import MduiSelect from '@/components/mdui/MduiSelect.vue';
import MduiSwitch from '@/components/mdui/MduiSwitch.vue';
import MduiTextField from '@/components/mdui/MduiTextField.vue';

const props = defineProps<{
  field: SettingsField;
  modelValue: unknown;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: unknown];
}>();

const normalizedColor = computed(() => {
  const value = String(props.modelValue ?? '');
  return /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000';
});

const onColorText = (value: string | number) => {
  emit('update:modelValue', String(value));
};
</script>

<template>
  <div v-if="field.type === 'boolean'" class="ah-field ah-field--switch">
    <div class="ah-field__text">
      <div class="ah-field__label">{{ field.label }}</div>
      <div v-if="field.description" class="ah-field__description">
        {{ field.description }}
      </div>
    </div>
    <MduiSwitch
      :model-value="Boolean(modelValue)"
      @update:model-value="(value) => emit('update:modelValue', value)"
    />
  </div>

  <div v-else-if="field.type === 'color'" class="ah-field ah-field--color">
    <MduiTextField
      :model-value="String(modelValue ?? '')"
      :label="field.label"
      :helper="field.description"
      type="text"
      @update:model-value="onColorText"
    />
    <input
      class="ah-color-input"
      type="color"
      :value="normalizedColor"
      @input="onColorText(($event.target as HTMLInputElement).value)"
    />
  </div>

  <MduiTextField
    v-else-if="field.type === 'number'"
    :model-value="Number(modelValue ?? field.default)"
    :label="field.label"
    :helper="field.description"
    :unit="field.unit"
    :min="field.min"
    :max="field.max"
    :step="field.step ?? 1"
    type="number"
    @update:model-value="(value) => emit('update:modelValue', value)"
  />

  <MduiSelect
    v-else-if="field.type === 'select'"
    :model-value="String(modelValue ?? field.default)"
    :label="field.label"
    :helper="field.description"
    :options="field.options"
    @update:model-value="(value) => emit('update:modelValue', value)"
  />

  <MduiTextField
    v-else
    :model-value="String(modelValue ?? field.default)"
    :label="field.label"
    :helper="field.description"
    :placeholder="field.placeholder"
    type="text"
    @update:model-value="(value) => emit('update:modelValue', value)"
  />
</template>
