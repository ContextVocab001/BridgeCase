const NVIDIA_OCR_URL = 'https://ai.api.nvidia.com/v1/cv/nvidia/nemotron-ocr-v2'

const OCR_TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAABLAAAAEsCAIAAABc390HAAATEklEQVR4nO3de5BWdf3A8bPL5sJGwzqAAxqOwQxMuLmwgIaw7lKCBNJCIWOSA0Q2jIowNCEViTOWC2GWF7KgEHGaoUTIabkqISaBTIMIruCFbriGEhPLLVjYPb8/ntzhtzcXxRz6vF5/ned8z3nO93v46z3nPEtWmqYJAAAA8WR/1BMAAADgoyEIAQAAghKEAAAAQQlCAACAoAQhAABAUIIQAAAgKEEIAAAQlCAEAAAIShACAAAEJQgBAACCEoQAAABBCUIAAICgBCEAAEBQghAAACAoQQgAABCUIAQAAAhKEAIAAAQlCAEAAIIShAAAAEEJQgAAgKAEIQAAQFCCEAAAIChBCAAAEJQgBAAACEoQAgAABCUIAQAAghKEAAAAQQlCAACAoAQhAABAUIIQAAAgKEEIAAAQlCAEAAAIShACAAAEJQgBAACCEoQAAABBCUIAAICgBCEAAEBQghAAACAoQQgAABCUIAQAAAhKEAIAAAQlCAEAAIIShAAAAEEJQgAAgKAEIQAAQFCCEAAAIChBCAAAEJQgBAAACEoQAgAABCUIAQAAghKEAAAAQQlCAACAoAQhAABAUIIQAAAgKEEIAAAQlCAEAAAI6vwIwpUrV5aWlpaWlubk5GQ2li9fnpeXV/qu+++/P0mS/Pz8Vp5VUlJSVFS0adOmBmdltmfOnPnLX/6yfuewYcNeeumlJEl+8Ytf5Obmvv3222de5dFHH+3Xr9/AgQP79ev32GOPZXYuWrSoqKiopKRk5MiR+/bty+xsfOnWL2379u3Dhg0bMmTI0KFD9+3b1+RZ5/KOAwAAAWSlafpRz+Es5OfnHzp0qPF2c3taOGvXrl3jx4/fuXNn49HnnnvuwQcfzCTW0aNH+/fvv2fPniRJysrKevbs2bt370mTJmWOX7du3T333FNRUZE58frrr7/77rvTNC0vL1+1alW7du3WrFlz3333bdiwoclLt35pffr0qaio+OQnP/nkk0/+5je/+fWvf93ykgEAAN7T+fGE8MNQUFBQVVXV5NCgQYNefPHF06dPJ0nyzDPPDB8+PEmS48ePHzt27Otf/3pFRUX9kfPnz58/f37muWJ+fv4Pf/jDefPm3Xfffffee2+7du2SJPnCF77Qo0ePU6dOtfLSzXnnnXdOnDiRJMkXv/jF22+//azOBQAAaFLcIFy/fv3nPve5JofatGnz2c9+duvWrUmSrFq1qqysLEmSdevWDR8+vFevXn/9619ramoyR+7evbtv3771JxYVFb3yyiuVlZVn7ly4cOHHPvaxVl66Offee29xcfHkyZOff/754uLiszoXAACgSTkf9QTev5qamtLS0sx2eXn5wIEDW3/WqVOn9uzZU1lZ2dxho0aNWrNmzeDBg7du3frII48kSfLUU0/t2LFj+fLlb7311qZNm4YOHdr4rDRNs7KyamtrP8ilm1zaxIkTy8rKfvvb306fPn3MmDF33313axYLAADQgvP4CeEFF1zw7LtaWYP1Z23evPnOO+9csmRJkiTZ2dmZhDt9+nROzn8Kefjw4Rs2bHjxxRf79u2bk5NTW1v72muv7dixY+vWrUuWLKl/a7R3797bt2+v//Lt27dffvnlPXv23LFjR2ZPmqYTJkxo7tKtXNqBAwf++Mc/XnjhhZMmTXrmmWd+9rOftfYeAQAANO88DsIPaOjQodu2bUuSZMCAAU8//XSSJOvWrRswYEBmND8/Py8vb/HixaNHj06SZPPmzYWFhZmh4uLi9evXZ7a/9a1vzZw5s7q6OkmSQ4cO3XnnnTNnzrz11ltnz5598uTJJEmWLVuW2Wjy0q2UlZU1bty4zF8rPXjw4KWXXvr+lw0AAPCu/5FXRgcOHFheXl5TUzN48ODMnkGDBs2bN6+F03v16rVz5866urqHHnrolltuKS8vT5Jk0aJF9Qdcf/31c+bMmTt3bpIkTz31VP2v/vLy8i666KLdu3d/+tOfHjZs2JtvvjlkyJDc3NyampqpU6d+/vOfT5Lk9ddf79evX+fOnS+66KIFCxY0d+ns7KaDvPHSFi5ceMMNN7Rr165NmzaLFy8+qxsFAADQpPPsv50AAADgXIn7yigAAEBwghAAACAoQQgAABCUIAQAAAhKEAIAAAQlCAEAAIIShAAAAEEJQgAAgKAEIQAAQFCCEAAAIChBCAAAEJQgBAAACEoQAgAABCUIAQAAghKEAAAAQQlCAACAoAQhAABAUIIQAAAgKEEIAAAQlCAEAAAIShACAAAEJQgBAACCEoQAAABBCUIAAICgBCEAAEBQghAAACAoQQgAABCUIAQAAAhKEAIAAAQlCAEAAIIShAAAAEEJQgAAgKAEIQAAQFCCEAAAIChBCAAAEJQgBAAACEoQAgAABCUIAQAAghKEAAAAQQlCAACAoAQhAABAUIIQAAAgKEEIAAAQlCAEAAAIShACAAAEJQgBAACCEoQAAABBCUIAAICgBCEAAEBQghAAACAoQQgAABCUIAQAAAhKEAIAAAQlCAEAAIIShAAAAEEJQgAAgKAEIQAAQFCCEAAAIChBCAAAEJQgBAAACEoQAgAABCUIAQAAghKEAAAAQQlCAACAoAQhAABAUIIQAAAgKEEIAAAQlCAEAAAIShACAAAEJQgBAACCEoQAAABBCUIAAICgBCEAAEBQghAAACAoQQgAABCUIAQAAAhKEAIAAAQlCAEAAIIShAAAAEEJQgAAgKAEIefS3LlzP+opAAAArXXeBGFeXl5paWlJSUlRUdGmTZs+1GtlqqaysvKRRx4523Pz8/Mbf1y5cmVpaWlpaWlOTk5mY/ny5Q2OPNPixYuLi4v79Omzfv36JEmqq6tHjx49ePDg0aNHV1dXJ0myYcOGq6++esiQIcXFxVu2bDnz3NWrV7dr1y6zfejQoYkTJ3bo0KG5CzU5sQbHNNd4DeZ/+PDh73//+3fdddcPfvCDkydPNjeBBnuefvrp7t27Zy49e/bs5uYJAAB8GLLSNP2o59Aq+fn5hw4dSpJk165d48eP37lz53/hWh/83BY+NneVAwcOjB07duPGja+99tqYMWN27949c+bMLl26zJgx40c/+tGBAwfmzp172WWXbdy48VOf+tTevXtHjRr1yiuvZM49cuTIdddd9/LLLx8+fDhJkuLi4nHjxn3ve997z+W0sOTmhhrsHzly5IgRI77zne/MmjVr//79DzzwQJMTaLDn8ccfP3bs2JQpU1qeHgAA8GE4b54Q1isoKKiqqvrXv/711a9+9dprr73mmmu2bduWJMlDDz3Ut2/foqKi9evXNx5NkiQ/P3/SpEkPPvhgnz59qqqqkiQ5efJkz549d+3aNXjw4IKCgh//+MdJksyZM+fo0aPDhg1L3n0Itn///hEjRlxzzTUjRozYv39/Zv93v/vdkpKSwsLClStXntsFHjx48Pbbb8/Ozu7WrdvBgweTJFm9evWNN96YJMmNN964atWqJEk6duyYGTp48OCxY8fqz501a9b06dOzs//zz/rEE09MnTr1rK7eYLH1d6OysvLMu9TYCy+8MGHChKysrGnTpvXq1au5CTTY849//KNr165nNUMAAOCcSc8THTp0yGysXbt27NixkydP3rp1a5qmf/vb3woLC9M07dy58+HDh3fv3n3zzTc3Hk3TtG3btmvXrk3T9J577vnpT3+apumaNWumTp06ZcqU55577uDBg127dm1wrczGTTfdtHTp0jRNly5dOn78+DRN27Vrd//996dpunfv3m7dujU5z/f82GCosSVLlnzta19L07RTp061tbVpmtbW1nbu3DlN023btuXm5hYUFOTm5v7ud7/LHP+HP/xh9OjR7zmHJtUf03ixmaEW7lLG2LFjb7jhhry8vAMHDjT35Y33TJ8+/ZZbbhk0aNCoUaPeeOON95wnAABwDp03r4zm5eVdeeWVp06d2rNnT2Vl5YABA3r06JEZqqqq2rNnz+TJk6urq2+99dahQ4d269atwWibNm3at29/+PDh7OzsV199ddq0aWvXrr3tttu+8pWvFBYWLlu27I033liwYMHRo0eTM16GzGxccsklf/7zn3Nzc0+ePNm9e/eqqqq2bdvu378/8/ywQ4cOmd/1nTnP+o/btm07fvx4/ccWXhmdPXv2888/P23atDFjxiRJsnfv3rKyso0bN3bu3Llz585vv/12dnZ2XV1dly5d3nnnnZKSkjvuuOPLX/7yE088sWbNmsWLF588ebKkpGTFihUXX3xxy6+tNqn+mMaLzQwdOXKkubuUUVNT8/Of/3zGjBkdO3Z8+OGHx44d28IE6vfMmDGjR48et91224oVKx5++OHf//73Lc8TAAA4lz7qIm2t+mdK8+bNKy8v79Kly7///e80TWtrazdt2pQZ2rRp05gxYyZOnNjk6JnPqfr3719dXT1w4MC6urrrrrtu4cKF+/bt+8QnPtHgyMxG165dT5w4kabpiRMnLr744jRN649Mz+aRYNrqJ4RHjhzp169f5iFnmqaXX355VVVVmqZvvvlmQUFBmqYXXnhh5pnh6dOnO3bsmKbpr371q969e5eUlJSUlLRp0+bmm29uzYUaH9N4sZmhFu5Sg+95+eWXL7300uZW3WDPX/7yl9OnT2cW0qlTp/ecJwAAcA6df78hHDp06LZt2wYNGpT58d6aNWvKy8urq6tLSkoGDhz4+OOPr169usFo4y8pKyubO3fulVdemZWV9ac//WncuHEnTpyo/9uYdXV1dXV19QcPGTIk87c3ly9fXlpamiRJ/Y/0Pgxpmk6YMOGb3/zmVVddldkzYsSIZcuWJUmybNmyESNGJEnSq1evzZs3J0myZcuWyy67LEmSm266qbKy8tlnn3322Wfbt2+/dOnS93f1xovN3I3Gd6mB0tLSmpqaJEkuueSSCy64oJWXmzVrVkVFRZIkL7zwwmc+85n3N2cAAOD9OW9eGa1/yfD48eNXXHHFhg0bpkyZcvz48ZycnEWLFnXv3n3+/PnLli2rq6ubPHlyWVnZN77xjTNHk///4uKrr756xRVXbNy48eqrr77rrruefPLJwsLCDRs2/P3vf8/NzR05cmRWVlZFRUXmlLfeemvy5MnHjh37+Mc/vnjx4q5du7bw5mfrP+bl5RUVFWW2Bw0aNG/evMz2o48+OnXq1P79+ydJ0r59+4qKiurq6gkTJvzzn//s1KnTY4891qFDh5deeumOO+5IkiQrK+snP/lJnz59mrxXTX5s+fY2XmzmbhQVFTW4SwMGDPjSl7707W9/O/MNK1aseOCBB7Zs2XLVVVfNmTPn2muvbWEC9Xtef/31SZMm5eTktG3bdsGCBfUv+gIAAP8F500Qcl74IP9jBwAA8F8mCAEAAII6/35DCAAAwDkhCAEAAIIShAAAAEEJQgAAgKAEIQAAQFCCEAAAIChBCAAAEJQgBAAACEoQAgAABCUIAQAAghKEAAAAQQlCAACAoAQhAABAUIIQAAAgKEEIAAAQlCAEAAAIShACAAAEJQgBAACCEoQAAABBCUIAAICgBCEAAEBQghAAACAoQQgAABCUIAQAAAhKEAIAAAQlCAEAAIIShAAAAEEJQgAAgKAEIQAAQFCCEAAAIChBCAAAEJQgBAAACEoQAgAABCUIAQAAghKEAAAAQQlCAACAoAQhAABAUIIQAAAgKEEIAAAQlCAEAAAIShACAAAEJQgBAACCEoQAAABBCUIAAICgBCEAAEBQghAAACAoQQgAABCUIAQAAAhKEAIAAAQlCAEAAIIShAAAAEEJQgAAgKAEIQAAQFCCEAAAIChBCAAAEJQgBAAACEoQAgAABCUIAQAAghKEAAAAQQlCAACAoAQhAABAUIIQAAAgKEEIAAAQlCAEAAAIShACAAAEJQgBAACCEoQAAABBCUIAAICgBCEAAEBQghAAACAoQQgAABCUIAQAAAhKEAIAAAQlCAEAAIIShAAAAEEJQgAAgKAEIQAAQFCCEAAAIChBCAAAEJQgBAAACEoQAgAABCUIAQAAghKEAAAAQQlCAACAoAQhAABAUIIQAAAgKEEIAAAQlCAEAAAIShACAAAEJQgBAACCEoQAAABBCUIAAICgBCEAAEBQghAAACAoQQgAABCUIAQAAAhKEAIAAAQlCAEAAIIShAAAAEEJQgAAgKAEIQAAQFCCEAAAIChBCAAAEJQgBAAACEoQAgAABCUIAQAAghKEAAAAQQlCAACAoAQhAABAUIIQAAAgKEEIAAAQlCAEAAAIShACAAAEJQgBAACCEoQAAABBCUIAAICgBCEAAEBQghAAACAoQQgAABCUIAQAAAhKEAIAAAQlCAEAAIIShAAAAEEJQgAAgKAEIQAAQFCCEAAAIChBCAAAEJQgBAAACEoQAgAABCUIAQAAghKEAAAAQQlCAACAoAQhAABAUIIQAAAgKEEIAAAQlCAEAAAIShACAAAEJQgBAACCEoQAAABBCUIAAICgBCEAAEBQghAAACAoQQgAABDU/wFmigujRPS2WQAAAABJRU5ErkJggg=='

const collectOcrText = (payload) => {
  const detections = []
  const pages = Array.isArray(payload?.data) ? payload.data : []
  for (const page of pages) {
    const items = Array.isArray(page?.text_detections) ? page.text_detections : []
    for (const item of items) {
      const text = String(item?.text_prediction?.text || '').trim()
      if (!text) continue
      const confidence = typeof item?.text_prediction?.confidence === 'number' ? item.text_prediction.confidence : null
      detections.push({ text, confidence })
    }
  }
  return { text: detections.map((item) => item.text).join('\n'), detections }
}

export const config = { maxDuration: 60 }

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }

  const apiKey = process.env.NVIDIA_API_KEY
  if (!apiKey) {
    response.status(503).json({ success: false, configured: false, message: 'NVIDIA_API_KEY is not configured in Vercel.' })
    return
  }

  try {
    const nvidiaResponse = await fetch(NVIDIA_OCR_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: [{ type: 'image_url', url: `data:image/png;base64,${OCR_TEST_IMAGE_BASE64}` }],
        merge_levels: ['paragraph'],
      }),
    })

    const responseText = await nvidiaResponse.text()
    if (!nvidiaResponse.ok) {
      response.status(nvidiaResponse.status).json({
        success: false, configured: true, connected: true,
        upstreamStatus: nvidiaResponse.status,
        message: 'NVIDIA received the OCR request but did not accept it.',
        upstreamBody: responseText.slice(0, 1000),
      })
      return
    }

    const payload = JSON.parse(responseText)
    const extracted = collectOcrText(payload)
    response.status(200).json({
      success: true, configured: true, connected: true, runtime: 'vercel-node',
      model: payload?.model || 'nvidia/nemotron-ocr-v2',
      text: extracted.text, detections: extracted.detections, usage: payload?.usage || null,
    })
  } catch (error) {
    console.error('Vercel NVIDIA OCR test error:', error)
    response.status(502).json({
      success: false, configured: true, connected: false, runtime: 'vercel-node',
      message: 'The Vercel function could not complete the NVIDIA OCR request.',
      detail: error instanceof Error ? error.message : 'Unknown OCR error.',
    })
  }
}
