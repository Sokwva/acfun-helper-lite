<template>
  <div class="mdui-textfield mdui-textfield-floating-label">
    <label class="mdui-textfield-label">{{ label }}</label>
    <select
      class="mdui-textfield-input ah-native-select"
      :value="modelValue"
      :disabled="disabled"
      @change="onChange"
    >
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <div v-if="helper" class="mdui-textfield-helper">{{ helper }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
  label: string;
  helper?: string;
  options: ReadonlyArray<{ label: string; value: string }>;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const onChange = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLSelectElement).value);
};
</script>

