import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import clsx from "clsx"
import { Listbox, Transition, RadioGroup } from "@headlessui/react"
import ArrowDown from "@/assets/arrow-down.svg"
import { useFloating, autoUpdate } from "@floating-ui/react-dom"

import type { Configuration as ConfigurationType } from "@evil-cards/server/src/lib/ws/send"

const votingPeriodOptions = [
  { value: 60, name: "НОРМАЛЬНАЯ" },
  { value: 30, name: "БЫСТРАЯ" },
  { value: 90, name: "МЕДЛЕННАЯ" }
] as const
const maxScoreOptions = [
  { value: 10, name: "10" },
  { value: 15, name: "15" },
  { value: 20, name: "20" }
] as const
const readerOptions = [
  { value: false, name: "НЕТ" },
  { value: true, name: "ЕСТЬ" }
] as const
const version18PlusOptions = [
  { value: false, name: "НЕТ" },
  { value: true, name: "ДА" }
] as const

const Configuration: React.FC<{
  configuration: ConfigurationType
  host?: boolean
  onSave?: (configuration: ConfigurationType) => void
}> = ({ configuration, host, onSave }) => {
  const [configurationCopy, setConfigurationCopy] = useState({
    ...configuration
  })
  useEffect(() => {
    setConfigurationCopy(configuration)
  }, [configuration])

  const handleChange = (configuration: Partial<ConfigurationType>) => {
    setConfigurationCopy((prev) => {
      const updated = {
        ...prev,
        ...configuration
      }

      onSave && onSave(updated)

      return updated
    })
  }

  return (
    <div className="flex min-h-0 w-full flex-auto flex-col items-center gap-4">
      <h2 className="text-center text-xl font-bold text-gray-100 sm:text-3xl">
        НАСТРОЙКИ
      </h2>
      <div className="scrollable flex min-h-0 w-full flex-auto flex-col gap-4">
        <Row label="СКОРОСТЬ ИГРЫ">
          <Select
            options={votingPeriodOptions}
            value={configurationCopy["votingDurationSeconds"]}
            disabled={!host}
            onChange={(votingDurationSeconds) =>
              handleChange({ votingDurationSeconds })
            }
          />
        </Row>
        <Row label="КОЛИЧЕСТВО ОЧКОВ ДЛЯ ПОБЕДЫ">
          <Select
            options={maxScoreOptions}
            value={configurationCopy["maxScore"]}
            disabled={!host}
            onChange={(maxScore) => handleChange({ maxScore })}
          />
        </Row>
        <Row label="ОЗВУЧКА">
          <Radio
            label="Озвучка"
            options={readerOptions}
            value={configurationCopy["reader"]}
            disabled={!host}
            onChange={(reader) => handleChange({ reader })}
          />
        </Row>
        <Row label="ВЕРСИЯ 18+">
          <Radio
            label="Версия 18+"
            options={version18PlusOptions}
            value={configurationCopy["version18Plus"]}
            disabled={!host}
            onChange={(version18Plus) => handleChange({ version18Plus })}
          />
        </Row>
      </div>
    </div>
  )
}

function Row({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
      <span className="text-center text-base font-bold text-gray-100">
        {label}
      </span>
      {children}
    </div>
  )
}

type Option<T> = {
  value: T
  name: string
}

type SelectProps<T> = {
  options: readonly Option<T>[]
  value: T extends (infer U)[] ? U : T
  disabled?: boolean
  onChange?: (value: T extends (infer U)[] ? U : T) => void
}

function Select<T>({ options, value, disabled, onChange }: SelectProps<T>) {
  const { x, y, strategy, refs } = useFloating({
    whileElementsMounted: autoUpdate
  })

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <Listbox.Button
        className={({ disabled }) =>
          clsx(
            "flex w-full items-center justify-between gap-4 rounded-lg bg-gray-100 p-4 sm:w-56",
            disabled && "opacity-50"
          )
        }
        ref={refs.setReference}
      >
        {({ open }) => (
          <>
            <span className="text-base font-semibold leading-none text-gray-900">
              {options.find((option) => option.value == value)?.name}
            </span>
            <ArrowDown className={clsx(open && "rotate-180")} />
          </>
        )}
      </Listbox.Button>
      <Portal>
        <Transition
          as={React.Fragment}
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          leave="transition ease-in duration-75"
        >
          <Listbox.Options
            ref={refs.setFloating}
            style={{
              position: strategy,
              top: y ?? 0,
              left: x ?? 0,
              width: refs.reference.current?.getBoundingClientRect().width
            }}
            className="z-50 mt-1 overflow-hidden rounded-lg bg-gray-100 py-1 shadow-lg"
          >
            {options.map((option) => (
              <Listbox.Option
                key={option.name}
                value={option.value}
                className={({ active }) =>
                  clsx(
                    "cursor-pointer px-4 py-2 text-gray-900 transition-colors",
                    active && "bg-gray-200"
                  )
                }
              >
                {option.name}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </Portal>
    </Listbox>
  )
}

type RadioProps<T> = {
  label: string
  options: readonly [Option<T>, Option<T>]
  value: T extends (infer U)[] ? U : T
  disabled?: boolean
  onChange?: (value: T extends (infer U)[] ? U : T) => void
}

function Radio<T>({
  label,
  options,
  value,
  disabled,
  onChange
}: RadioProps<T>) {
  return (
    <RadioGroup
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-full sm:w-56"
    >
      <RadioGroup.Label className="sr-only">{label}</RadioGroup.Label>
      <div
        className={clsx(
          "flex w-full gap-0.5 rounded-lg border-2 border-gray-100 p-0.5",
          disabled && "opacity-50"
        )}
      >
        {options.map((option) => (
          <RadioGroup.Option
            key={option.name}
            value={option.value}
            className="flex-1"
          >
            {({ checked, disabled }) => (
              <RadioGroup.Label
                className={clsx(
                  "flex justify-center py-3 font-semibold leading-none text-gray-100",
                  checked && "rounded-md bg-gray-100 text-gray-900",
                  !disabled && "cursor-pointer"
                )}
              >
                {option.name}
              </RadioGroup.Label>
            )}
          </RadioGroup.Option>
        ))}
      </div>
    </RadioGroup>
  )
}

const Portal: React.FC<React.PropsWithChildren> = ({ children }) => {
  return createPortal(children, document.body)
}

export default Configuration
