'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { FAQ_ITEMS } from '@/lib/constants/help-text'
import { cn } from '@/lib/utils'

interface FAQItemProps {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}

function FAQItem({ question, answer, isOpen, onToggle }: FAQItemProps) {
  return (
    <div className="border-b border-primary/10 last:border-0">
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between gap-4 py-4 text-left',
          'hover:text-accent-primary transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 rounded'
        )}
        aria-expanded={isOpen}
      >
        <span className="font-medium text-primary">{question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 flex-shrink-0 text-accent-primary" />
        ) : (
          <ChevronDown className="w-5 h-5 flex-shrink-0 text-secondary" />
        )}
      </button>
      {isOpen && (
        <div className="pb-4 text-sm text-secondary animate-in slide-in-from-top-2">
          {answer}
        </div>
      )}
    </div>
  )
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-primary">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-secondary mt-1">
            Find answers to common questions about Forma
          </p>
        </div>

        <div className="space-y-0">
          {FAQ_ITEMS.map((item, index) => (
            <FAQItem
              key={index}
              question={item.question}
              answer={item.answer}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </div>

        <div className="mt-6 p-4 bg-glass rounded-lg border border-primary/10">
          <p className="text-sm text-secondary">
            <span className="font-medium text-primary">Still have questions?</span>
            {' '}
            Look for the <span className="inline-flex items-center"><span className="text-accent-primary">ⓘ</span></span> help icons throughout the app for more detailed explanations.
          </p>
        </div>
      </div>
    </Card>
  )
}
