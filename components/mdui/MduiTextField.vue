<template>
  <div class="mdui-textfield mdui-textfield-floating-label">
    <label class="mdui-textfield-label">{{ displayLabel }}</label>
    <input
      class="mdui-textfield-input"
      :type="type"
      :value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :placeholder="placeholder"
      :disabled="disabled"
      @input="onInput"
    />
    <div v-if="helper" class="mdui-textfield-helper">{{ helper }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  modelValue: string | number;
  label: string;
  helper?: string;
  type?: 'text' | 'number' | 'search';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  placeholder?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
}>();

const displayLabel = computed(() =>
  props.unit ? `${props.label}（${props.unit}）` : props.label,
);

const onInput = (event: Event) => {
  if (!event.isTrusted) {
    return;
  }

  const input = event.target as HTMLInputElement;

  if (props.type === 'number') {
    const value = input.valueAsNumber;
    if (Number.isFinite(value)) {
      emit('update:modelValue', value);
    }
    return;
  }

  emit('update:modelValue', input.value);
};
</script>


