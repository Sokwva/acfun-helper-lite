<template>
  <label class="mdui-switch">
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="onChange"
    />
    <i class="mdui-switch-icon"></i>
    <span v-if="label" class="ah-switch-label">{{ label }}</span>
  </label>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean;
  label?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const onChange = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLInputElement).checked);
};
</script>
